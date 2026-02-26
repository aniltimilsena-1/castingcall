import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Play, Bookmark, MoreHorizontal, Sparkles, RefreshCw, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";

interface FeedItem {
    id: string; // unique: profile_id + url
    type: "photo" | "video";
    url: string;
    caption: string;
    owner: {
        id: string;
        name: string;
        photo_url: string | null;
        role: string | null;
        plan: string | null;
    };
    createdAt: string;
}

interface FeedPageProps {
    onProfileClick?: (profile: any) => void;
}

export default function FeedPage({ onProfileClick }: FeedPageProps) {
    const { user } = useAuth();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    // ── Post modal state
    const [openPost, setOpenPost] = useState<FeedItem | null>(null);

    // likes: map of mediaUrl → count + isLiked
    const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
    // comments: map of mediaUrl → comment[]
    const [comments, setComments] = useState<Record<string, { id: string; content: string; user_id: string; commenter: string; commenter_photo: string | null; created_at: string }[]>>({});
    const [openComments, setOpenComments] = useState<string | null>(null);
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [postingComment, setPostingComment] = useState<string | null>(null);

    // ─── Load Feed ───────────────────────────────────────────────────────────────
    useEffect(() => {
        setRefreshing(true);
        const loadFeed = async () => {
            setLoading(true);
            try {
                // 1. Fetch all profiles with their photos
                const { data: profiles, error } = await supabase
                    .from("profiles")
                    .select("id, user_id, name, photo_url, role, plan, photos, created_at")
                    .order("created_at", { ascending: false });

                if (error) throw error;

                // 2. Try to fetch videos (column may not exist yet — ignore errors)
                const videoMap: Record<string, string[]> = {};
                try {
                    const { data: videoProfiles } = await (supabase
                        .from("profiles")
                        .select("user_id, videos") as any);
                    (videoProfiles || []).forEach((p: any) => {
                        if (p.videos?.length) videoMap[p.user_id] = p.videos;
                    });
                } catch (_) { /* videos column may not exist yet */ }

                // 3. Try to fetch captions (table may not exist — ignore errors)
                const captionMap: Record<string, string> = {};
                try {
                    const { data: captionRows } = await supabase
                        .from("photo_captions")
                        .select("photo_url, description");
                    (captionRows || []).forEach((c: any) => {
                        captionMap[c.photo_url] = c.description || "";
                    });
                } catch (_) { /* photo_captions table may not exist */ }

                // 4. Build unified feed items
                const items: FeedItem[] = [];
                (profiles || []).forEach((p: any) => {
                    const owner = {
                        id: p.user_id,
                        name: p.name || "Unknown",
                        photo_url: p.photo_url,
                        role: p.role,
                        plan: p.plan
                    };
                    (p.photos || []).forEach((url: string) => {
                        items.push({ id: `${p.user_id}-${url}`, type: "photo", url, caption: captionMap[url] || "", owner, createdAt: p.created_at });
                    });
                    (videoMap[p.user_id] || []).forEach((url: string) => {
                        items.push({ id: `${p.user_id}-${url}`, type: "video", url, caption: captionMap[url] || "", owner, createdAt: p.created_at });
                    });
                });

                // Shuffle for "for you" feel
                const shuffled = items.sort(() => Math.random() - 0.4);
                setFeed(shuffled);

                // 5. Try to fetch likes & comments — non-critical, never block render
                if (shuffled.length > 0) {
                    const allUrls = shuffled.map(i => i.url);
                    try {
                        const { data: likeRows } = await supabase
                            .from("photo_likes")
                            .select("photo_url, user_id")
                            .in("photo_url", allUrls);

                        const likeMap: Record<string, { count: number; liked: boolean }> = {};
                        (likeRows || []).forEach((l: any) => {
                            if (!likeMap[l.photo_url]) likeMap[l.photo_url] = { count: 0, liked: false };
                            likeMap[l.photo_url].count++;
                            if (user && l.user_id === user.id) likeMap[l.photo_url].liked = true;
                        });
                        setLikes(likeMap);
                    } catch (_) { /* likes unavailable */ }

                    try {
                        // Fetch comments without FK join
                        const { data: commentRows } = await supabase
                            .from("photo_comments")
                            .select("id, photo_url, content, user_id, created_at")
                            .in("photo_url", allUrls)
                            .order("created_at", { ascending: true });

                        // Collect unique commenter user_ids and fetch their profiles
                        const commenterIds = [...new Set((commentRows || []).map((c: any) => c.user_id))];
                        const profileMap: Record<string, { name: string; photo_url: string | null }> = {};
                        if (commenterIds.length > 0) {
                            const { data: commenterProfiles } = await supabase
                                .from("profiles")
                                .select("user_id, name, photo_url")
                                .in("user_id", commenterIds);
                            (commenterProfiles || []).forEach((p: any) => {
                                profileMap[p.user_id] = { name: p.name || "User", photo_url: p.photo_url || null };
                            });
                        }

                        const commentMap: Record<string, any[]> = {};
                        (commentRows || []).forEach((c: any) => {
                            if (!commentMap[c.photo_url]) commentMap[c.photo_url] = [];
                            const p = profileMap[c.user_id];
                            commentMap[c.photo_url].push({
                                id: c.id,
                                content: c.content,
                                user_id: c.user_id,
                                commenter: p?.name || "User",
                                commenter_photo: p?.photo_url || null,
                                created_at: c.created_at,
                            });
                        });
                        setComments(commentMap);
                    } catch (_) { /* comments unavailable */ }

                }
            } catch (err: any) {
                toast.error("Could not load feed: " + (err.message || "Unknown error"));
            } finally {
                // Always stop loading — no matter what fails
                setLoading(false);
                setRefreshing(false);
            }
        };

        loadFeed();
    }, [user, refreshKey]);

    // ─── Like handler ─────────────────────────────────────────────────────────
    const handleLike = async (url: string) => {
        if (!user) { toast.error("Sign in to like posts"); return; }
        const current = likes[url] || { count: 0, liked: false };

        // Optimistic update
        setLikes(prev => ({
            ...prev,
            [url]: { count: current.liked ? current.count - 1 : current.count + 1, liked: !current.liked }
        }));

        if (current.liked) {
            await supabase.from("photo_likes").delete().eq("photo_url", url).eq("user_id", user.id);
        } else {
            await supabase.from("photo_likes").insert({ photo_url: url, user_id: user.id });
        }
    };

    // ─── Comment handler ──────────────────────────────────────────────────────
    const handleComment = async (url: string) => {
        if (!user) { toast.error("Sign in to comment"); return; }
        const text = (commentText[url] || "").trim();
        if (!text) return;
        setPostingComment(url);

        const { data, error } = await supabase
            .from("photo_comments")
            .insert({ photo_url: url, user_id: user.id, content: text })
            .select("id, content, user_id, created_at")
            .single();

        if (!error && data) {
            // fetch commenter name
            const { data: commenterProfile } = await supabase
                .from("profiles")
                .select("name, photo_url")
                .eq("user_id", user.id)
                .single();

            setComments(prev => ({
                ...prev,
                [url]: [...(prev[url] || []), {
                    id: data.id,
                    content: data.content,
                    user_id: data.user_id,
                    commenter: commenterProfile?.name || "You",
                    commenter_photo: commenterProfile?.photo_url || null,
                    created_at: data.created_at,
                }]
            }));
            setCommentText(prev => ({ ...prev, [url]: "" }));
        }
        setPostingComment(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="max-w-[620px] mx-auto px-4 py-6 pb-20 space-y-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-xl animate-pulse">
                        {/* Fake header */}
                        <div className="flex items-center gap-3 px-4 py-4">
                            <div className="w-11 h-11 rounded-full bg-secondary/60" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-secondary/60 rounded-full w-32" />
                                <div className="h-2.5 bg-secondary/40 rounded-full w-20" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-secondary/40" />
                        </div>
                        {/* Fake media */}
                        <div className="w-full bg-secondary/40" style={{ height: `${240 + i * 40}px` }} />
                        {/* Fake action bar */}
                        <div className="flex gap-4 px-4 py-3">
                            <div className="h-5 w-14 bg-secondary/50 rounded-full" />
                            <div className="h-5 w-14 bg-secondary/50 rounded-full" />
                            <div className="flex-1" />
                            <div className="h-5 w-5 bg-secondary/40 rounded-full" />
                        </div>
                        {/* Fake caption */}
                        <div className="px-4 pb-4 space-y-2">
                            <div className="h-2.5 bg-secondary/50 rounded-full w-3/4" />
                            <div className="h-2.5 bg-secondary/30 rounded-full w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (feed.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4 px-6 text-center">
                <Sparkles className="w-14 h-14 text-primary/30" />
                <h2 className="font-display text-3xl text-primary">Nothing here yet</h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                    Be the first to share photos and videos on CastingCall! Upload from your profile to appear in the feed.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* ── Full-screen Post Modal ── */}
            <AnimatePresence>
                {openPost && (
                    <PostModal
                        item={openPost}
                        likeData={likes[openPost.url] || { count: 0, liked: false }}
                        commentList={comments[openPost.url] || []}
                        commentValue={commentText[openPost.url] || ""}
                        isPostingComment={postingComment === openPost.url}
                        onClose={() => setOpenPost(null)}
                        onLike={() => handleLike(openPost.url)}
                        onCommentChange={(v) => setCommentText(prev => ({ ...prev, [openPost.url]: v }))}
                        onCommentSubmit={() => handleComment(openPost.url)}
                        onProfileClick={onProfileClick}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-[620px] mx-auto px-4 py-6 pb-20">
                {/* Refresh button row */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs font-semibold disabled:opacity-40"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
                <div className="space-y-8">
                    {feed.map((item, idx) => (
                        <FeedCard
                            key={item.id}
                            item={item}
                            likeData={likes[item.url] || { count: 0, liked: false }}
                            commentList={comments[item.url] || []}
                            commentValue={commentText[item.url] || ""}
                            commentsOpen={openComments === item.url}
                            isPostingComment={postingComment === item.url}
                            onLike={() => handleLike(item.url)}
                            onToggleComments={() => setOpenComments(openComments === item.url ? null : item.url)}
                            onCommentChange={(v) => setCommentText(prev => ({ ...prev, [item.url]: v }))}
                            onCommentSubmit={() => handleComment(item.url)}
                            onProfileClick={onProfileClick}
                            onOpenPost={() => setOpenPost(item)}
                            index={idx}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

interface FeedCardProps {
    item: FeedItem;
    likeData: { count: number; liked: boolean };
    commentList: { id: string; content: string; commenter: string; commenter_photo: string | null; created_at: string }[];
    commentValue: string;
    commentsOpen: boolean;
    isPostingComment: boolean;
    onLike: () => void;
    onToggleComments: () => void;
    onCommentChange: (v: string) => void;
    onCommentSubmit: () => void;
    onProfileClick?: (profile: any) => void;
    onOpenPost: () => void;
    index: number;
}

function FeedCard({
    item, likeData, commentList, commentValue, commentsOpen,
    isPostingComment, onLike, onToggleComments, onCommentChange,
    onCommentSubmit, onProfileClick, onOpenPost, index
}: FeedCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [heartAnim, setHeartAnim] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleDoubleTap = () => {
        if (!likeData.liked) {
            onLike();
            setHeartAnim(true);
            setTimeout(() => setHeartAnim(false), 900);
        }
    };

    const timeAgo = (date: string) => {
        const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (sec < 60) return `${sec}s ago`;
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
        return `${Math.floor(sec / 86400)}d ago`;
    };

    return (
        <motion.div
            className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.4 }}
        >
            {/* ── Post Header ── */}
            <div className="flex items-center gap-3 px-4 py-4">
                <button
                    className="flex-shrink-0"
                    onClick={() => onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan })}
                >
                    <div className="w-11 h-11 rounded-full bg-secondary border-2 border-primary overflow-hidden flex items-center justify-center font-display text-lg text-primary">
                        {item.owner.photo_url
                            ? <img src={item.owner.photo_url} className="w-full h-full object-cover" alt="" />
                            : (item.owner.name?.[0] || "?").toUpperCase()
                        }
                    </div>
                </button>
                <div className="flex-1 min-w-0">
                    <button
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors text-left truncate block"
                        onClick={() => onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan })}
                    >
                        {item.owner.name}
                    </button>
                    <div className="text-[0.68rem] text-muted-foreground flex items-center gap-1.5">
                        <span className="text-primary/70 font-medium">{item.owner.role || "Member"}</span>
                        <span>·</span>
                        <span>{timeAgo(item.createdAt)}</span>
                        {item.owner.plan === "pro" && (
                            <>
                                <span>·</span>
                                <span className="text-amber-500 font-bold text-[0.6rem] uppercase tracking-wider">PRO</span>
                            </>
                        )}
                    </div>
                </div>
                <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            {/* ── Media ── */}
            <div className="relative bg-black" onDoubleClick={handleDoubleTap}>
                {item.type === "photo" ? (
                    <img
                        src={item.url}
                        alt={item.caption || "Post"}
                        className="w-full object-cover max-h-[520px] cursor-pointer"
                        style={{ minHeight: "200px" }}
                        onClick={onOpenPost}
                    />
                ) : (
                    <div className="relative w-full">
                        <video
                            ref={videoRef}
                            src={item.url}
                            className="w-full max-h-[520px] object-contain bg-black"
                            loop
                            playsInline
                            onClick={() => {
                                if (videoRef.current) {
                                    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
                                    else { videoRef.current.play(); setIsPlaying(true); }
                                }
                            }}
                        />
                        {!isPlaying && (
                            <button
                                className="absolute inset-0 flex items-center justify-center"
                                onClick={() => { videoRef.current?.play(); setIsPlaying(true); }}
                            >
                                <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                    <Play size={28} fill="white" className="text-white ml-1" />
                                </div>
                            </button>
                        )}
                    </div>
                )}

                {/* Double-tap heart animation */}
                <AnimatePresence>
                    {heartAnim && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1.4 }}
                            exit={{ opacity: 0, scale: 1.8 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Heart size={80} fill="#f59e0b" className="text-amber-500 drop-shadow-2xl" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Action Bar ── */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-4">
                <button
                    onClick={onLike}
                    className={`flex items-center gap-1.5 transition-all ${likeData.liked ? "text-red-500 scale-110" : "text-muted-foreground hover:text-red-400"}`}
                >
                    <Heart
                        size={22}
                        fill={likeData.liked ? "currentColor" : "none"}
                        className="transition-transform active:scale-125"
                    />
                    <span className="text-sm font-bold">{likeData.count > 0 ? likeData.count : ""}</span>
                </button>

                <button
                    onClick={onToggleComments}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                    <MessageCircle size={22} />
                    <span className="text-sm font-bold">{commentList.length > 0 ? commentList.length : ""}</span>
                </button>

                <div className="flex-1" />

                <button className="text-muted-foreground hover:text-primary transition-colors">
                    <Bookmark size={22} />
                </button>
            </div>

            {/* ── Caption ── */}
            {item.caption && (
                <div className="px-4 pb-3 pt-1">
                    <span className="text-sm text-foreground">
                        <span className="font-bold mr-1.5">{item.owner.name}</span>
                        {item.caption}
                    </span>
                </div>
            )}

            {/* ── Comments ── */}
            <AnimatePresence>
                {commentsOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border/30"
                    >
                        {/* Comment list */}
                        <div className="px-4 pt-3 space-y-3 max-h-[220px] overflow-y-auto">
                            {commentList.length === 0 && (
                                <p className="text-muted-foreground/50 text-xs text-center py-2">No comments yet — be the first!</p>
                            )}
                            {commentList.map((c) => (
                                <div key={c.id} className="flex gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center text-[0.6rem] font-bold text-primary">
                                        {c.commenter_photo
                                            ? <img src={c.commenter_photo} className="w-full h-full object-cover" alt="" />
                                            : c.commenter?.[0]?.toUpperCase()
                                        }
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-bold text-xs text-foreground mr-1.5">{c.commenter}</span>
                                        <span className="text-xs text-foreground/80">{c.content}</span>
                                        <div className="text-[0.6rem] text-muted-foreground/50 mt-0.5">{timeAgo(c.created_at)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Comment input */}
                        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/20 mt-2">
                            <input
                                type="text"
                                value={commentValue}
                                onChange={(e) => onCommentChange(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !isPostingComment && onCommentSubmit()}
                                placeholder="Add a comment…"
                                className="flex-1 bg-secondary/30 border border-border rounded-full px-4 py-2 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                            />
                            <button
                                onClick={onCommentSubmit}
                                disabled={!commentValue.trim() || !!isPostingComment}
                                className="p-2 text-primary disabled:opacity-30 hover:scale-110 transition-transform"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comments count tap zone (when closed) */}
            {!commentsOpen && commentList.length > 0 && (
                <button
                    onClick={onToggleComments}
                    className="px-4 pb-3 text-muted-foreground/60 text-xs hover:text-primary transition-colors"
                >
                    View all {commentList.length} comment{commentList.length !== 1 ? "s" : ""}
                </button>
            )}

            {!commentsOpen && commentList.length === 0 && (
                <button
                    onClick={onToggleComments}
                    className="px-4 pb-3 text-muted-foreground/50 text-xs hover:text-primary transition-colors"
                >
                    Add a comment…
                </button>
            )}
        </motion.div>
    );
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────

interface PostModalProps {
    item: FeedItem;
    likeData: { count: number; liked: boolean };
    commentList: { id: string; content: string; commenter: string; commenter_photo: string | null; created_at: string }[];
    commentValue: string;
    isPostingComment: boolean;
    onClose: () => void;
    onLike: () => void;
    onCommentChange: (v: string) => void;
    onCommentSubmit: () => void;
    onProfileClick?: (profile: any) => void;
}

function PostModal({ item, likeData, commentList, commentValue, isPostingComment, onClose, onLike, onCommentChange, onCommentSubmit, onProfileClick }: PostModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const timeAgo = (date: string) => {
        const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (sec < 60) return `${sec}s ago`;
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
        return `${Math.floor(sec / 86400)}d ago`;
    };

    // close on backdrop click
    return (
        <motion.div
            className="fixed inset-0 z-[500] flex flex-col bg-background"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
            {/* ── Top bar ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card/80 backdrop-blur-md">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-secondary rounded-full transition-colors text-foreground"
                >
                    <ArrowLeft size={20} />
                </button>
                {/* Post owner */}
                <button
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                    onClick={() => { onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan }); onClose(); }}
                >
                    <div className="w-9 h-9 rounded-full bg-secondary border-2 border-primary overflow-hidden flex-shrink-0 flex items-center justify-center font-display text-sm text-primary">
                        {item.owner.photo_url
                            ? <img src={item.owner.photo_url} className="w-full h-full object-cover" alt="" />
                            : (item.owner.name?.[0] || "?").toUpperCase()
                        }
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">{item.owner.name}</div>
                        <div className="text-[0.65rem] text-primary/70">{item.owner.role || "Member"}</div>
                    </div>
                </button>
                {/* Like button */}
                <button
                    onClick={onLike}
                    className={`flex items-center gap-1 transition-all ${likeData.liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
                >
                    <Heart size={20} fill={likeData.liked ? "currentColor" : "none"} />
                    {likeData.count > 0 && <span className="text-sm font-bold">{likeData.count}</span>}
                </button>
            </div>

            {/* ── Media (full width) ── */}
            <div className="bg-black flex-shrink-0">
                {item.type === "photo" ? (
                    <img
                        src={item.url}
                        alt={item.caption || "Post"}
                        className="w-full object-contain max-h-[55vh]"
                    />
                ) : (
                    <div className="relative">
                        <video
                            ref={videoRef}
                            src={item.url}
                            className="w-full max-h-[55vh] object-contain"
                            loop playsInline
                            onClick={() => {
                                if (videoRef.current) {
                                    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
                                    else { videoRef.current.play(); setIsPlaying(true); }
                                }
                            }}
                        />
                        {!isPlaying && (
                            <button className="absolute inset-0 flex items-center justify-center"
                                onClick={() => { videoRef.current?.play(); setIsPlaying(true); }}>
                                <div className="w-14 h-14 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                    <Play size={24} fill="white" className="text-white ml-1" />
                                </div>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Caption */}
            {item.caption && (
                <div className="px-4 py-3 border-b border-border/30 flex-shrink-0">
                    <span className="text-sm"><span className="font-bold mr-1.5">{item.owner.name}</span>{item.caption}</span>
                </div>
            )}

            {/* ── Comments (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {commentList.length === 0 && (
                    <p className="text-center text-muted-foreground/50 text-sm py-6">No comments yet — be the first!</p>
                )}
                {commentList.map((c) => (
                    <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center text-[0.65rem] font-bold text-primary">
                            {c.commenter_photo
                                ? <img src={c.commenter_photo} className="w-full h-full object-cover" alt="" />
                                : c.commenter?.[0]?.toUpperCase()
                            }
                        </div>
                        <div className="flex-1 bg-secondary/20 rounded-2xl px-3 py-2">
                            <span className="font-bold text-xs text-foreground mr-1.5">{c.commenter}</span>
                            <span className="text-xs text-foreground/80">{c.content}</span>
                            <div className="text-[0.6rem] text-muted-foreground/50 mt-1">{timeAgo(c.created_at)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Comment Input (pinned to bottom) ── */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-card flex-shrink-0"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                <input
                    type="text"
                    value={commentValue}
                    onChange={(e) => onCommentChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isPostingComment && onCommentSubmit()}
                    placeholder="Write a comment…"
                    className="flex-1 bg-secondary/30 border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                />
                <button
                    onClick={onCommentSubmit}
                    disabled={!commentValue.trim() || !!isPostingComment}
                    className="p-2.5 bg-primary text-primary-foreground rounded-full disabled:opacity-30 hover:opacity-85 transition-opacity"
                >
                    <Send size={16} />
                </button>
            </div>
        </motion.div>
    );
}
