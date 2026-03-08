import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Play, Bookmark, MoreHorizontal, Sparkles, RefreshCw, ArrowLeft, X, Crown, Lock, Unlock, Gift, ShoppingBag, Minimize2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PaymentUpgradeDialog from "./PaymentUpgradeDialog";
import { useVideo } from "@/contexts/VideoContext";

interface FeedItem {
    id: string; // unique: profile_id + url
    type: "photo" | "video";
    url: string;
    caption: string;
    isPremium: boolean;
    price: number;
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
    const { user, profile: currentUserProfile } = useAuth();
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

    // ── Subs & Purchases state
    const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
    const [purchasedPosts, setPurchasedPosts] = useState<Set<string>>(new Set());

    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        type: 'pro' | 'fan_pass' | 'unlock' | 'product' | 'tip';
        amount: number;
        metadata: any;
        currency?: string;
        currencySymbol?: string;
    }>({ open: false, type: 'unlock', amount: 0, metadata: {} });

    const [isNepal, setIsNepal] = useState<boolean | null>(null);

    // Detect User Location (Country)
    useEffect(() => {
        const detectLocation = async () => {
            try {
                const res = await fetch("https://ipapi.co/json/");
                const data = await res.json();
                setIsNepal(data.country_code === "NP");
            } catch (err) {
                console.error("Location detection failed:", err);
                setIsNepal(false);
            }
        };
        detectLocation();
    }, []);

    // ─── Load Feed ───────────────────────────────────────────────────────────────
    useEffect(() => {
        setRefreshing(true);
        const loadFeed = async () => {
            setLoading(true);
            try {
                // 1. Fetch all profiles with their photos
                let q = supabase
                    .from("profiles")
                    .select("id, user_id, name, photo_url, role, plan, photos, created_at");

                if (currentUserProfile?.role !== 'Admin') {
                    q = q.neq('role', 'Admin');
                }

                const { data: profiles, error } = await q.order("created_at", { ascending: false });

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

                // 3. Try to fetch captions & premium status
                const captionMap: Record<string, { description: string, isPremium: boolean, price: number }> = {};
                try {
                    const { data: captionRows } = await supabase
                        .from("photo_captions")
                        .select("photo_url, description, is_premium, price");
                    (captionRows || []).forEach((c: any) => {
                        captionMap[c.photo_url] = {
                            description: c.description || "",
                            isPremium: !!c.is_premium,
                            price: c.price || 0
                        };
                    });
                } catch (_) { /* photo_captions metadata unavailable */ }

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
                        const meta = captionMap[url] || { description: "", isPremium: false, price: 0 };
                        items.push({ id: `${p.user_id}-${url}`, type: "photo", url, caption: meta.description, isPremium: meta.isPremium, price: meta.price, owner, createdAt: p.created_at });
                    });
                    (videoMap[p.user_id] || []).forEach((url: string) => {
                        const meta = captionMap[url] || { description: "", isPremium: false, price: 0 };
                        items.push({ id: `${p.user_id}-${url}`, type: "video", url, caption: meta.description, isPremium: meta.isPremium, price: meta.price, owner, createdAt: p.created_at });
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

                    // 6. Fetch User's Specific Access (Subs & Purchases)
                    if (user) {
                        try {
                            const { data: subs } = await supabase.from("fan_subscriptions" as any).select("talent_id").eq("subscriber_id", user.id).eq("status", "active");
                            const { data: buys } = await supabase.from("photo_purchases" as any).select("photo_url").eq("buyer_id", user.id);

                            if (subs) setSubscriptions(new Set((subs as any[]).map(s => s.talent_id)));
                            if (buys) setPurchasedPosts(new Set((buys as any[]).map(p => p.photo_url)));
                        } catch (_) { /* access check failed */ }
                    }

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

                    // 6. Fetch user subscriptions if logged in
                    if (user) {
                        try {
                            const { data: subRows } = await supabase
                                .from("fan_subscriptions")
                                .select("talent_id")
                                .eq("subscriber_id", user.id)
                                .eq("status", "active");
                            if (subRows) setSubscriptions(new Set(subRows.map(s => s.talent_id)));
                        } catch (_) { }
                    }
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
    const handleDeleteComment = async (photoUrl: string, commentId: string) => {
        const { error } = await supabase.from("photo_comments").delete().eq("id", commentId);
        if (!error) {
            setComments(prev => ({
                ...prev,
                [photoUrl]: (prev[photoUrl] || []).filter(c => c.id !== commentId)
            }));
            toast.success("Comment deleted");
        } else {
            toast.error("Could not delete comment");
        }
    };

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
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                <Sparkles className="w-14 h-14 text-primary/30" />
                <h2 className="font-display text-3xl text-primary">Nothing here yet</h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                    Be the first to share photos and videos on CastingCall! Upload from your profile to appear in the feed.
                </p>
                <button onClick={handleRefresh} className="mt-4 text-primary bg-primary/10 px-6 py-2 rounded-full text-xs uppercase tracking-widest">Retry Refresh</button>
            </div>
        );
    }

    return (
        <div className="h-full bg-black overflow-hidden relative">
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

            <div className="absolute top-6 right-6 z-50 flex flex-col gap-4">
                <button
                    onClick={handleRefresh}
                    className={`w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:border-primary transition-all shadow-2xl ${refreshing ? 'animate-spin text-primary' : ''}`}
                    title="Refresh Feed"
                >
                    <RefreshCw size={24} />
                </button>
            </div>

            <div className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth">
                {feed.map((item, idx) => {
                    const isUnlocked = !item.isPremium ||
                        (user && (item.owner.id === user.id ||
                            subscriptions.has(item.owner.id) ||
                            purchasedPosts.has(item.url) ||
                            currentUserProfile?.role === 'Admin'));

                    return (
                        <div key={item.id} className="h-full w-full snap-start snap-always relative border-b border-white/5">
                            <FeedCard
                                item={item}
                                isUnlocked={isUnlocked}
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
                                onOpenPost={() => {
                                    if (isUnlocked) setOpenPost(item);
                                    else toast.info("Subscribe or pay to unlock this content!");
                                }}
                                onUnlock={(type: 'unlock' | 'fan_pass') => {
                                    if (type === 'fan_pass') {
                                        setPaymentModal({
                                            open: true,
                                            type: 'fan_pass',
                                            amount: isNepal ? 199 : 1.99,
                                            currency: isNepal ? 'NPR' : 'USD',
                                            currencySymbol: isNepal ? 'NPR ' : '$',
                                            metadata: { talent_id: item.owner.id }
                                        });
                                    } else {
                                        setPaymentModal({
                                            open: true,
                                            type: 'unlock',
                                            amount: item.price || (isNepal ? 499 : 4.99),
                                            currency: isNepal ? 'NPR' : 'USD',
                                            currencySymbol: isNepal ? 'NPR ' : '$',
                                            metadata: { post_url: item.url, talent_id: item.owner.id }
                                        });
                                    }
                                }}
                                onTip={() => {
                                    setPaymentModal({
                                        open: true,
                                        type: 'tip',
                                        amount: isNepal ? 100 : 1.00,
                                        currency: isNepal ? 'NPR' : 'USD',
                                        currencySymbol: isNepal ? 'NPR ' : '$',
                                        metadata: { talent_id: item.owner.id }
                                    });
                                }}
                                index={idx}
                            />
                        </div>
                    );
                })}
            </div>

            <PaymentUpgradeDialog
                open={paymentModal.open}
                onOpenChange={(open: boolean) => setPaymentModal(prev => ({ ...prev, open }))}
                user={user}
                type={paymentModal.type}
                amount={paymentModal.amount}
                currency={paymentModal.currency}
                currencySymbol={paymentModal.currencySymbol}
                metadata={paymentModal.metadata}
                onSuccess={() => {
                    if (paymentModal.type === 'unlock') {
                        setPurchasedPosts(prev => new Set([...prev, paymentModal.metadata.post_url]));
                    } else if (paymentModal.type === 'fan_pass') {
                        setSubscriptions(prev => new Set([...prev, paymentModal.metadata.talent_id]));
                    }
                    handleRefresh();
                }}
            />
        </div>
    );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

interface FeedCardProps {
    item: FeedItem;
    isUnlocked: boolean;
    likeData: { count: number; liked: boolean };
    commentList: { id: string; content: string; user_id: string; commenter: string; commenter_photo: string | null; created_at: string }[];
    commentValue: string;
    commentsOpen: boolean;
    isPostingComment: string | null;
    onLike: () => void;
    onDeleteComment: (commentId: string) => void;
    onToggleComments: () => void;
    onCommentChange: (v: string) => void;
    onCommentSubmit: () => void;
    onProfileClick?: (profile: any) => void;
    onOpenPost: () => void;
    onUnlock: (type: 'unlock' | 'fan_pass') => void;
    onTip: () => void;
    index: number;
}

function FeedCard({
    item, isUnlocked, likeData, commentList, commentValue, commentsOpen,
    isPostingComment, onLike, onDeleteComment, onToggleComments, onCommentChange,
    onCommentSubmit, onProfileClick, onOpenPost, onUnlock, onTip, index
}: FeedCardProps) {
    const { user, profile: currentUserProfile } = useAuth();
    const { setPipVideo, setIsPipOpen } = useVideo();
    const [isPlaying, setIsPlaying] = useState(false);
    const [heartAnim, setHeartAnim] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && isUnlocked && item.type === 'video') {
                    videoRef.current?.play().catch(console.error);
                    setIsPlaying(true);
                } else {
                    videoRef.current?.pause();
                    setIsPlaying(false);
                }
            },
            { threshold: 0.6 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isUnlocked, item.type]);

    const handleDoubleTap = () => {
        if (!likeData.liked) {
            onLike();
            setHeartAnim(true);
            setTimeout(() => setHeartAnim(false), 900);
        }
    };

    const handlePip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPipVideo({ url: item.url, title: item.caption, owner: item.owner.name });
        setIsPipOpen(true);
        toast.info("Video minimized to Picture-in-Picture");
    };

    const timeAgo = (date: string) => {
        const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (sec < 60) return `${sec}s ago`;
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
        return `${Math.floor(sec / 86400)}d ago`;
    };

    return (
        <div ref={containerRef} className="h-full w-full relative bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* ── Background Media ── */}
            <div className="absolute inset-0 z-0 h-full w-full" onDoubleClick={handleDoubleTap}>
                {item.type === "photo" ? (
                    <img
                        src={item.url}
                        alt={item.caption || "Post"}
                        className={`w-full h-full object-contain transition-all duration-700 ${!isUnlocked ? "blur-3xl opacity-50 scale-125" : ""}`}
                    />
                ) : (
                    <video
                        ref={videoRef}
                        src={item.url}
                        className={`w-full h-full object-cover transition-all duration-700 ${!isUnlocked ? "blur-3xl opacity-50 scale-125" : ""}`}
                        loop
                        muted
                        playsInline
                        onClick={() => {
                            if (!isUnlocked) return;
                            if (videoRef.current) {
                                if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
                                else { videoRef.current.play(); setIsPlaying(true); }
                            }
                        }}
                    />
                )}
            </div>

            {/* Overlaid UI (Actions - Right Side) */}
            <div className="absolute right-4 bottom-32 flex flex-col gap-6 z-20 items-center">
                <button
                    className="flex flex-shrink-0 flex-col items-center gap-1 group"
                    onClick={() => onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan })}
                >
                    <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden bg-secondary">
                        {item.owner.photo_url ? (
                            <img src={item.owner.photo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-display text-primary uppercase">{item.owner.name[0]}</div>
                        )}
                    </div>
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center -mt-2.5 z-10 border-2 border-black group-hover:scale-110 transition-transform">
                        <ArrowLeft size={10} className="text-black rotate-[-90deg]" />
                    </div>
                </button>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={onLike}
                        className={`w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center transition-all ${likeData.liked ? "text-red-500 scale-110" : "text-white hover:text-red-400"}`}
                    >
                        <Heart size={26} fill={likeData.liked ? "currentColor" : "none"} />
                    </button>
                    <span className="text-[0.65rem] text-white font-medium drop-shadow-md">{likeData.count || ""}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={onToggleComments}
                        className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:text-primary transition-colors"
                    >
                        <MessageCircle size={26} fill="none" />
                    </button>
                    <span className="text-[0.65rem] text-white font-medium drop-shadow-md">{commentList.length || ""}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={onTip}
                        className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-amber-500 hover:scale-110 transition-transform"
                    >
                        <Gift size={26} />
                    </button>
                    <span className="text-[0.6rem] text-white font-medium uppercase tracking-tighter drop-shadow-md">TIPS</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => {
                            const url = `${window.location.origin}/profile/${item.owner.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Profile link copied!");
                        }}
                        className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:text-primary transition-colors"
                    >
                        <Send size={24} className="rotate-[-20deg]" />
                    </button>
                    <span className="text-[0.6rem] text-white font-medium uppercase tracking-tighter drop-shadow-md">SHARE</span>
                </div>

                {item.type === 'video' && isUnlocked && (
                    <button
                        onClick={handlePip}
                        className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    >
                        <Minimize2 size={20} />
                    </button>
                )}

                <button className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white">
                    <Bookmark size={20} />
                </button>
            </div>

            {/* Overlaid Information (Bottom Left) */}
            <div className="absolute left-4 bottom-16 right-20 z-10 text-white pointer-events-none group">
                <div className="pointer-events-auto inline-flex items-center gap-2 mb-3">
                    <span className="font-display text-lg tracking-wide uppercase drop-shadow-lg">{item.owner.name}</span>
                    {(item.owner.plan === 'pro' || item.owner.role === 'Admin') && <Crown size={14} className="text-amber-500 fill-amber-500/10" />}
                </div>
                <p className="text-sm line-clamp-2 leading-relaxed opacity-90 drop-shadow-md mb-3 pointer-events-auto">
                    {item.caption}
                </p>
                <div className="flex items-center gap-3 opacity-70 text-[0.65rem] uppercase tracking-widest pointer-events-auto mt-2">
                    <span className="flex items-center gap-1"><Sparkles size={10} /> {item.owner.role}</span>
                    <span>·</span>
                    <span>{timeAgo(item.createdAt)}</span>
                </div>
            </div>

            {/* Music Disc Aesthetic */}
            <div className="absolute right-4 bottom-14 z-20">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-stone-800 to-stone-500 border-4 border-stone-900 shadow-2xl flex items-center justify-center overflow-hidden"
                >
                    {item.owner.photo_url ? (
                        <img src={item.owner.photo_url} className="w-full h-full object-cover opacity-50 contrast-125" alt="" />
                    ) : (
                        <div className="w-4 h-4 rounded-full bg-stone-900" />
                    )}
                </motion.div>
            </div>

            {/* Lock Overlay */}
            {!isUnlocked && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
                    <div className="p-8 bg-card/60 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl flex flex-col items-center text-center max-w-[85%]">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 animate-pulse">
                            <Lock size={32} className="text-primary" />
                        </div>
                        <h3 className="font-display text-2xl mb-2 text-white italic">Premium Access</h3>
                        <p className="text-sm text-muted-foreground mb-8 max-w-[240px]">This exclusive content is locked. Support {item.owner.name} to view.</p>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => onUnlock('unlock')}
                                className="w-full bg-primary text-black font-bold py-4 rounded-2xl text-[0.65rem] tracking-[2px] uppercase hover:opacity-90 flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                            >
                                <Unlock size={14} />
                                Unlock Post · ${item.price || "4.99"}
                            </button>
                            <button
                                onClick={() => onUnlock('fan_pass')}
                                className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl text-[0.65rem] tracking-[2px] uppercase hover:bg-white/10 flex items-center justify-center gap-2 transition-all"
                            >
                                <Crown size={14} className="text-amber-500" />
                                Get Fan Pass
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Double-tap heart animation */}
            <AnimatePresence>
                {heartAnim && (
                    <motion.div
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 1.5] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <Heart size={120} fill="#f43f5e" className="text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comments Overlay Drawer */}
            <AnimatePresence>
                {commentsOpen && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute inset-x-0 bottom-0 z-[100] bg-card/95 backdrop-blur-3xl rounded-t-[2.5rem] border-t border-white/10 flex flex-col h-[70%]"
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0">
                            <div className="text-[0.6rem] font-bold tracking-[3px] uppercase text-primary">Comments ({commentList.length})</div>
                            <button onClick={onToggleComments} className="p-2 hover:bg-white/5 rounded-full text-muted-foreground"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                            {commentList.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-4">
                                    <MessageCircle size={48} />
                                    <p className="text-xs uppercase tracking-widest italic">Be the first to comment</p>
                                </div>
                            )}
                            {commentList.map((c) => (
                                <div key={c.id} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-secondary border border-white/5 flex-shrink-0 overflow-hidden">
                                        {c.commenter_photo ? <img src={c.commenter_photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">{c.commenter[0]}</div>}
                                    </div>
                                    <div className="flex-1 group/comment">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white">{c.commenter}</span>
                                                {(user?.id === c.user_id || currentUserProfile?.role === 'Admin') && (
                                                    <button
                                                        onClick={() => handleDeleteComment(item.url, c.id)}
                                                        className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-[0.6rem] text-muted-foreground uppercase">{timeAgo(c.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed">{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-white/5 flex-shrink-0 bg-background/50">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={commentValue}
                                    onChange={(e) => onCommentChange(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !isPostingComment && onCommentSubmit()}
                                    placeholder="Speak your mind..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-12 py-4 text-xs outline-none focus:border-primary transition-all text-white"
                                />
                                <button
                                    onClick={onCommentSubmit}
                                    disabled={!commentValue.trim() || !!isPostingComment}
                                    className="absolute right-2 top-2 bottom-2 w-10 bg-primary rounded-xl flex items-center justify-center text-black disabled:opacity-30 transition-all hover:scale-105"
                                >
                                    <Send size={16} fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
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
                        <div className="font-normal text-sm text-foreground truncate flex items-center gap-1.5">
                            {item.owner.name}
                            {(item.owner.plan === "pro" || item.owner.role === "Admin") && <Crown size={12} className="text-amber-500 fill-amber-500/10" />}
                        </div>
                        <div className="text-[0.65rem] text-primary/70">{item.owner.role || "Member"}</div>
                    </div>
                </button>
                {/* Like button */}
                <button
                    onClick={onLike}
                    className={`flex items-center gap-1 transition-all ${likeData.liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
                >
                    <Heart size={20} fill={likeData.liked ? "currentColor" : "none"} />
                    {likeData.count > 0 && <span className="text-sm font-normal">{likeData.count}</span>}
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
                    <span className="text-sm"><span className="font-normal mr-1.5">{item.owner.name}</span>{item.caption}</span>
                </div>
            )}

            {/* ── Comments (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {commentList.length === 0 && (
                    <p className="text-center text-muted-foreground/50 text-sm py-6">No comments yet — be the first!</p>
                )}
                {commentList.map((c) => (
                    <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center text-[0.65rem] font-normal text-primary">
                            {c.commenter_photo
                                ? <img src={c.commenter_photo} className="w-full h-full object-cover" alt="" />
                                : c.commenter?.[0]?.toUpperCase()
                            }
                        </div>
                        <div className="flex-1 bg-secondary/20 rounded-2xl px-3 py-2">
                            <span className="font-normal text-xs text-foreground mr-1.5">{c.commenter}</span>
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
