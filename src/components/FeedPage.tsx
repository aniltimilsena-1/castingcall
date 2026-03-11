import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { feedService } from "@/services/feedService";
import { profileService, Profile } from "@/services/profileService";
import { paymentService } from "@/services/paymentService";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, Sparkles, ArrowLeft, X, Crown, Lock, Unlock, Gift, Minimize2, Trash2, Play, MoreVertical } from "lucide-react";
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
        metadata: Record<string, any>;
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
                const isAdmin = currentUserProfile?.role === 'Admin';
                const [profiles, videoMap, captionMap] = await Promise.all([
                    feedService.getFeedData(isAdmin),
                    feedService.getVideoMap(),
                    feedService.getCaptionMap()
                ]);

                // Build unified feed items
                const items: FeedItem[] = [];
                (profiles || []).forEach((p: any) => {
                    const owner = {
                        id: p.user_id,
                        name: p.name || "Unknown",
                        photo_url: p.photo_url || null,
                        role: p.role,
                        plan: p.plan
                    };
                    (p.photos || []).forEach((url: string) => {
                        const meta = captionMap[url] || { description: "", isPremium: false, price: 0 };
                        items.push({ id: `${p.user_id}-${url}`, type: "photo", url, caption: meta.description, isPremium: meta.isPremium, price: meta.price, owner, createdAt: p.created_at || new Date().toISOString() });
                    });
                    (videoMap[p.user_id] || []).forEach((url: string) => {
                        const meta = captionMap[url] || { description: "", isPremium: false, price: 0 };
                        items.push({ id: `${p.user_id}-${url}`, type: "video", url, caption: meta.description, isPremium: meta.isPremium, price: meta.price, owner, createdAt: p.created_at || new Date().toISOString() });
                    });
                });

                // Shuffle for "for you" feel
                const shuffled = items.sort(() => Math.random() - 0.4);
                setFeed(shuffled);

                // Fetch social data (likes/comments)
                const mediaUrls = shuffled.map(i => i.url);
                const [likeRows, commentRows] = await Promise.all([
                    feedService.getLikes(mediaUrls),
                    feedService.getComments(mediaUrls)
                ]);

                // Map likes
                const likeMap: Record<string, { count: number; liked: boolean }> = {};
                mediaUrls.forEach(url => {
                    const itemLikes = likeRows.filter((l: any) => l.photo_url === url);
                    likeMap[url] = {
                        count: itemLikes.length,
                        liked: !!(user && itemLikes.find((l: any) => l.user_id === user.id))
                    };
                });
                setLikes(likeMap);

                // Map comments (need unique commenters)
                const uniqueCommenters = Array.from(new Set(commentRows.map((c: any) => c.user_id)));
                const commenterProfiles = await feedService.getCommenters(uniqueCommenters);

                const commentMap: Record<string, any[]> = {};
                mediaUrls.forEach(url => {
                    commentMap[url] = commentRows
                        .filter((c: any) => c.photo_url === url)
                        .map((c: any) => {
                            const p = commenterProfiles.find((pr: any) => pr.user_id === c.user_id);
                            return { ...c, commenter: p?.name || "Unknown", commenter_photo: p?.photo_url || null };
                        });
                });
                setComments(commentMap);

                if (user) {
                    const [subs, purchased] = await Promise.all([
                        paymentService.getFanSubscriptions(user.id),
                        paymentService.getPurchasedPosts(user.id)
                    ]);
                    setSubscriptions(new Set(subs));
                    setPurchasedPosts(purchased);
                }
            } catch (err) {
                console.error("Feed load error:", err);
                toast.error("Failed to load feed");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        };
        loadFeed();
    }, [user, refreshKey, currentUserProfile]);

    // ─── Like handler ─────────────────────────────────────────────────────────
    const handleLike = async (mediaUrl: string) => {
        if (!user) {
            toast.error("Please log in to like content");
            return;
        }

        const isLiked = likes[mediaUrl]?.liked;
        try {
            if (isLiked) {
                await feedService.unlikePost(mediaUrl, user.id);
                setLikes(prev => ({
                    ...prev,
                    [mediaUrl]: { count: Math.max(0, prev[mediaUrl].count - 1), liked: false }
                }));
            } else {
                await feedService.likePost(mediaUrl, user.id);
                setLikes(prev => ({
                    ...prev,
                    [mediaUrl]: { count: (prev[mediaUrl]?.count || 0) + 1, liked: true }
                }));
            }
        } catch (err: any) {
            toast.error(err.message || "Operation failed");
        }
    };

    // ─── Comment handler ──────────────────────────────────────────────────────
    const handleDeleteComment = async (commentId: string, photoUrl: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;

        try {
            await feedService.deleteComment(commentId);
            setComments(prev => ({
                ...prev,
                [photoUrl]: prev[photoUrl].filter(c => c.id !== commentId)
            }));
            toast.success("Comment deleted");
        } catch (err: any) {
            toast.error(err.message || "Failed to delete comment");
        }
    };

    const handleComment = async (mediaUrl: string) => {
        const text = commentText[mediaUrl];
        if (!user || !text?.trim()) return;

        setPostingComment(mediaUrl);
        try {
            const data = await feedService.addComment(mediaUrl, user.id, text);
            if (!data) throw new Error("Could not add comment");

            const newComment = {
                ...data,
                commenter: currentUserProfile?.name || "Me",
                commenter_photo: currentUserProfile?.photo_url || null
            };

            setComments(prev => ({
                ...prev,
                [mediaUrl]: [...(prev[mediaUrl] || []), newComment]
            }));
            setCommentText(prev => ({ ...prev, [mediaUrl]: "" }));
            toast.success("Comment added!");
        } catch (err: any) {
            toast.error(err.message || "Failed to post comment");
        } finally {
            setPostingComment(null);
        }
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
                    Be the first to share photos and videos on CaastingCall! Upload from your profile to appear in the feed.
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
                        onDeleteComment={(cid) => handleDeleteComment(cid, openPost.url)}
                        onProfileClick={onProfileClick}
                    />
                )}
            </AnimatePresence>


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
                                onDeleteComment={(cid) => handleDeleteComment(cid, item.url)}
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
    isPostingComment: boolean;
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
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            if (video.duration) {
                const p = (video.currentTime / video.duration) * 100;
                setProgress(p);
            }
        };

        video.addEventListener('timeupdate', updateProgress);
        return () => video.removeEventListener('timeupdate', updateProgress);
    }, []);

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
            {/* Overlaid UI (Actions - Right Side) */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-5 z-20 items-center">
                <div className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer" onClick={onLike}>
                    <button
                        className={`w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center transition-all ${likeData.liked ? "text-red-500" : "text-white"}`}
                    >
                        <Heart size={28} fill={likeData.liked ? "currentColor" : "none"} strokeWidth={likeData.liked ? 0 : 2} />
                    </button>
                    <span className="text-[0.7rem] text-white font-medium drop-shadow-lg">{likeData.count || "0"}</span>
                </div>
                
                <div className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer" onClick={onToggleComments}>
                    <button className="w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center text-white">
                        <MessageCircle size={28} strokeWidth={2} />
                    </button>
                    <span className="text-[0.7rem] text-white font-medium drop-shadow-lg">{commentList.length || "0"}</span>
                </div>

                <div className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer" onClick={onTip}>
                    <button className="w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center text-amber-500">
                        <Gift size={28} strokeWidth={2} />
                    </button>
                    <span className="text-[0.6rem] text-white font-medium uppercase tracking-tighter drop-shadow-lg">TIP</span>
                </div>

                <div className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer" onClick={() => {
                    const url = `${window.location.origin}/profile/${item.owner.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied!");
                }}>
                    <button className="w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center text-white">
                        <Send size={26} strokeWidth={2} className="rotate-[-10deg]" />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer">
                    <button className="w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center text-white">
                        <Bookmark size={26} strokeWidth={2} />
                    </button>
                </div>

                {item.type === 'video' && isUnlocked && (
                    <button onClick={handlePip} className="w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-all">
                        <Minimize2 size={24} strokeWidth={2} />
                    </button>
                )}

                <button className="w-11 h-11 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white">
                    <MoreVertical size={24} />
                </button>
            </div>

            {/* Overlaid Information (Bottom Left) */}
            <div className="absolute left-4 bottom-10 right-20 z-10 text-white flex flex-col gap-4 pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <button 
                        onClick={() => onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan })}
                        className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-stone-800"
                    >
                        {item.owner.photo_url ? (
                            <img src={item.owner.photo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-bold">{item.owner.name[0]}</div>
                        )}
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-tight drop-shadow-md">{item.owner.name}</span>
                            {(item.owner.plan === 'pro' || item.owner.role === 'Admin') && <Crown size={12} className="text-amber-500 fill-amber-500/10" />}
                            <span className="text-white/40 text-xs">·</span>
                            <button className="text-[0.65rem] font-bold border border-white/30 rounded-md px-2 py-0.5 hover:bg-white/10 transition-colors uppercase tracking-widest">Follow</button>
                        </div>
                        <span className="text-[0.6rem] opacity-60 uppercase tracking-widest">{item.owner.role}</span>
                    </div>
                </div>

                <div className="pointer-events-auto max-w-[90%]">
                    <p className="text-sm leading-relaxed drop-shadow-md line-clamp-2">
                        {item.caption}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 pointer-events-auto opacity-70">
                    <Sparkles size={12} className="text-primary" />
                    <div className="text-[0.6rem] uppercase tracking-[2px] overflow-hidden whitespace-nowrap">
                        <motion.div animate={{ x: [0, -100, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
                            Original Audio · {item.owner.name}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Video Progress Bar */}
            {item.type === 'video' && isUnlocked && (
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white/20 z-50 overflow-hidden">
                    <motion.div 
                        className="h-full bg-white/60" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Music Disc Aesthetic */}
            <div className="absolute right-4 bottom-10 z-20">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-stone-900 to-stone-700 border-[3px] border-stone-800/80 shadow-2xl flex items-center justify-center overflow-hidden"
                >
                    {item.owner.photo_url ? (
                        <img src={item.owner.photo_url} className="w-full h-full object-cover opacity-60 contrast-125" alt="" />
                    ) : (
                        <div className="w-3 h-3 rounded-full bg-stone-950" />
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
                                                <span className="text-xs font-bold text-white uppercase tracking-wider">{c.commenter}</span>
                                                {(user?.id === c.user_id || currentUserProfile?.role === 'Admin') && (
                                                    <button
                                                        onClick={() => onDeleteComment(c.id)}
                                                        className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 size={10} />
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
    onDeleteComment: (commentId: string) => void;
    onProfileClick?: (profile: any) => void;
}

function PostModal({ item, likeData, commentList, commentValue, isPostingComment, onClose, onLike, onCommentChange, onCommentSubmit, onDeleteComment, onProfileClick }: PostModalProps) {
    const { user, profile: currentUserProfile } = useAuth();
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
                        <div className="flex-1 bg-secondary/20 rounded-2xl px-3 py-2 group/comment relative">
                            <div className="flex items-center justify-between">
                                <span className="font-normal text-xs text-foreground mr-1.5">{c.commenter}</span>
                                {(user?.id === (c as any).user_id || currentUserProfile?.role === 'Admin') && (
                                    <button
                                        onClick={() => onDeleteComment(c.id)}
                                        className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                )}
                            </div>
                            <span className="text-xs text-foreground/80 break-words">{c.content}</span>
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
