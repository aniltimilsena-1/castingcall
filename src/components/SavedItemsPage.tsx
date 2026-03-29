import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { profileService, Profile } from "@/services/profileService";
import { feedService } from "@/services/feedService";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, MoreVertical, Trash2, ArrowLeft, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { FeedItem, Comment } from "@/types/feed";
import PostModal from "@/components/PostModal";
import MoodBoardSection from "./MoodBoardSection";
import ProfileDetailDialog from "./ProfileDetailDialog";
import { Plus, Layout } from "lucide-react";

export default function SavedItemsPage() {
    const { user, profile: currentUserProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<"talents" | "posts" | "boards">("talents");
    const [savedTalents, setSavedTalents] = useState<Profile[]>([]);
    const [savedPosts, setSavedPosts] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    
    // Modal state for viewing a post
    const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
    const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
    const [postLikes, setPostLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
    const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
    const [replyingTo, setReplyingTo] = useState<{ id: string; commenter: string; photoUrl: string } | null>(null);
    const [commentValue, setCommentValue] = useState("");
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        if (user) {
            fetchSavedData();
        }
    }, [user]);

    const fetchSavedData = async () => {
        setLoading(true);
        try {
            // Fetch Saved Talents
            const talentsResult = await profileService.getSavedProfiles(user!.id);
            setSavedTalents(talentsResult || []);

            // Fetch Saved Posts URLS
            const savedUrls = await feedService.getSavedPostUrls(user!.id);
            if (savedUrls.length > 0) {
                const results = await feedService.getPostsByUrls(savedUrls);
                const items: FeedItem[] = [];
                (results || []).forEach((p: any) => {
                    const photos = p.photos || [];
                    const videos = p.videos || [];
                    [...photos, ...videos].forEach(url => {
                        if (savedUrls.includes(url)) {
                            items.push({
                                id: `${p.id}-${url}`,
                                url,
                                type: videos.includes(url) ? "video" : "photo",
                                owner: {
                                    id: p.user_id,
                                    name: p.name,
                                    photo_url: p.photo_url,
                                    role: p.role || "Member",
                                    plan: p.plan
                                },
                                caption: null,
                                isPremium: false,
                                price: 0,
                                isUnlocked: true,
                                createdAt: p.created_at
                            });
                        }
                    });
                });
                setSavedPosts(items);
            }
        } catch (error) {
            console.error("Error fetching saved items:", error);
            toast.error("Failed to load saved items");
        } finally {
            setLoading(false);
        }
    };

    const handleUnsaveTalent = async (talentId: string) => {
        try {
            await profileService.unsaveProfile(user!.id, talentId);
            setSavedTalents(prev => prev.filter(t => t.id !== talentId));
            toast.success("Talent removed from saved");
        } catch (error) {
            toast.error("Failed to remove talent");
        }
    };

    const handleUnsavePost = async (postUrl: string) => {
        try {
            await feedService.unsavePost(user!.id, postUrl);
            setSavedPosts(prev => prev.filter(p => p.url !== postUrl));
            if (selectedPost?.url === postUrl) setSelectedPost(null);
            toast.success("Post removed from saved");
        } catch (error) {
            toast.error("Failed to remove post");
        }
    };

    const openPostDetails = async (post: FeedItem) => {
        setSelectedPost(post);
        // Fetch comments and likes for this specific post
        try {
            const [likes, comments] = await Promise.all([
                feedService.getLikes([post.url]),
                feedService.getComments([post.url])
            ]);

            const uniqueCommenters = Array.from(new Set(comments.map(c => c.user_id)));
            const commenterProfiles = await feedService.getCommenters(uniqueCommenters);

            setPostLikes({ [post.url]: { count: likes.length, liked: likes.some(l => l.user_id === user?.id) } });
            
            const commentsWithMetadata = comments.map(c => {
                const prof = commenterProfiles.find(p => p.user_id === c.user_id);
                return {
                    ...c,
                    commenter: prof?.name || "Member",
                    commenter_photo: prof?.photo_url || null
                } as Comment;
            });
            setPostComments({ [post.url]: commentsWithMetadata });

            // Build comment likes map
            const commentIds = comments.map(c => c.id);
            if (commentIds.length > 0) {
                const cLikes = await feedService.getCommentLikes(commentIds);
                const cLikesMap: Record<string, { count: number; liked: boolean }> = {};
                commentIds.forEach(id => {
                    const relevant = cLikes.filter(cl => cl.comment_id === id);
                    cLikesMap[id] = {
                        count: relevant.length,
                        liked: relevant.some(rl => rl.user_id === user?.id)
                    };
                });
                setCommentLikes(cLikesMap);
            }
        } catch (err) {
            console.error("Error loading post details:", err);
        }
    };

    const handleLike = async () => {
        if (!selectedPost || !user) return;
        const postUrl = selectedPost.url;
        const current = postLikes[postUrl] || { count: 0, liked: false };
        try {
            if (current.liked) {
                await feedService.unlikePost(postUrl, user.id);
                setPostLikes(prev => ({ ...prev, [postUrl]: { count: Math.max(0, current.count - 1), liked: false } }));
            } else {
                await feedService.likePost(postUrl, user.id);
                setPostLikes(prev => ({ ...prev, [postUrl]: { count: current.count + 1, liked: true } }));
            }
        } catch (err) { toast.error("Action failed"); }
    };

    const handleSharePost = async (item: FeedItem) => {
        const shareData = {
            title: `Check out ${item.owner.name} on CaastingCall`,
            text: item.caption || `Saved Post by ${item.owner.name}`,
            url: `${window.location.origin}/profile/${item.owner.id}?post=${encodeURIComponent(item.url)}`,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error("Share failed", err);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareData.url);
                toast.success("Link copied to clipboard!");
            } catch (err) {
                console.error("Clipboard copy failed", err);
                toast.error("Failed to copy link");
            }
        }
    };

    const handleCommentSubmit = async () => {
        if (!selectedPost || !user || !commentValue.trim()) return;
        setIsPostingComment(true);
        try {
            const newComment = await feedService.addComment(selectedPost.url, user.id, commentValue, replyingTo?.id);
            // Re-fetch comments to be safe and get correctly formatted data
            await openPostDetails(selectedPost); 
            setCommentValue("");
            setReplyingTo(null);
            toast.success("Comment added");
        } catch (err) { toast.error("Failed to post comment"); } finally { setIsPostingComment(false); }
    };

    return (
        <div className="min-h-screen bg-transparent pb-20 pt-4 relative">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-3 text-foreground">
                    <Bookmark className="text-primary" /> Saved Items
                </h1>

                {/* Tabs */}
                <div className="flex bg-secondary/30 p-1 rounded-2xl mb-8 border border-border/50">
                    <button
                        onClick={() => setActiveTab("talents")}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "talents" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-foreground/5"
                        }`}
                    >
                        Saved Talents ({savedTalents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "posts" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-foreground/5"
                        }`}
                    >
                        Saved Posts ({savedPosts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("boards")}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                            activeTab === "boards" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-foreground/5"
                        }`}
                    >
                        Collections
                        <div className="absolute top-1 right-1">
                          <Plus size={10} className="text-primary/40" />
                        </div>
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm">Loading your collection...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "talents" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedTalents.length === 0 ? (
                                    <div className="col-span-full py-20 text-center bg-secondary/10 rounded-3xl border border-dashed border-border">
                                        <p className="text-muted-foreground">You haven't saved any talents yet.</p>
                                    </div>
                                ) : (
                                    savedTalents.map(talent => (
                                        <div key={talent.id} className="stitched-card bg-card p-4 rounded-3xl flex items-center gap-4 group hover:border-primary transition-all shadow-sm relative overflow-hidden">
                                            <div className="stitched-card-scanner" />
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-secondary border border-border flex-shrink-0 relative">
                                                {talent.photo_url ? (
                                                    <motion.img 
                                                        whileHover={{ scale: 1.1 }}
                                                        src={talent.photo_url} 
                                                        className="w-full h-full object-cover" 
                                                        alt="" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary/50">
                                                        {(talent.name?.[0] || talent.email?.[0] || "?").toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-foreground truncate">{talent.name}</h3>
                                                <p className="text-xs text-primary font-bold uppercase tracking-widest">{talent.role || "Talent"}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleUnsaveTalent(talent.id)}
                                                className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                                title="Unsave"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === "posts" && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {savedPosts.length === 0 ? (
                                    <div className="col-span-full py-20 text-center bg-secondary/10 rounded-3xl border border-dashed border-border">
                                        <p className="text-muted-foreground">You haven't saved any feed posts yet.</p>
                                    </div>
                                ) : (
                                    savedPosts.map(post => (
                                        <div key={post.id} className="stitched-card relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border border-border hover:border-primary transition-all shadow-sm" onClick={() => openPostDetails(post)}>
                                            <div className="stitched-card-scanner" />
                                            {post.type === "photo" ? (
                                                <motion.img 
                                                    whileHover={{ scale: 1.1, x: 5, y: 5 }}
                                                    transition={{ duration: 0.8 }}
                                                    src={post.url} 
                                                    className="w-full h-full object-cover" 
                                                    alt="" 
                                                />
                                            ) : (
                                                <video src={post.url} className="w-full h-full object-cover" muted />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 z-10">
                                                <div className="flex items-center gap-2 text-white text-[10px] font-bold">
                                                    <img src={post.owner.photo_url || ""} className="w-4 h-4 rounded-full border border-white/20" alt="" />
                                                    <span className="truncate">{post.owner.name}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleUnsavePost(post.url); }}
                                                className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                            >
                                                <Bookmark size={14} fill="currentColor" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === "boards" && user && (
                          <MoodBoardSection 
                            userId={user.id} 
                            onViewTalent={(p) => {
                              setViewingProfile(p);
                              setIsProfileOpen(true);
                            }}
                          />
                        )}
                    </>
                )}
            </div>

            <ProfileDetailDialog 
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                profile={viewingProfile}
                user={user}
                currentUserProfile={currentUserProfile}
                isSaved={viewingProfile ? savedTalents.some(t => t.id === viewingProfile.id) || savedTalents.some(t => t.user_id === viewingProfile.user_id) : false}
                onToggleSave={(e, id) => {
                    if (savedTalents.some(t => t.id === id || t.user_id === id)) {
                      handleUnsaveTalent(id);
                    } else {
                      // ProfileDetail handles the save internally normally, but we keep this for consistency
                      fetchSavedData();
                    }
                }}
            />

            <AnimatePresence>
                {selectedPost && (
                    <PostModal
                        item={selectedPost}
                        likeData={postLikes[selectedPost.url] || { count: 0, liked: false }}
                        commentList={postComments[selectedPost.url] || []}
                        commentLikes={commentLikes}
                        replyingTo={replyingTo}
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted(!isMuted)}
                        onLikeComment={(cid) => toast.info("Coming soon in saved items")}
                        onReply={(cid, name) => {
                            const comment = postComments[selectedPost.url]?.find(c => c.id === cid);
                            setReplyingTo({ id: cid, commenter: name, photoUrl: comment?.commenter_photo || selectedPost.url });
                        }}
                        onCancelReply={() => setReplyingTo(null)}
                        commentValue={commentValue}
                        isPostingComment={isPostingComment}
                        onClose={() => setSelectedPost(null)}
                        onLike={handleLike}
                        onCommentChange={setCommentValue}
                        onCommentSubmit={handleCommentSubmit}
                        onDeleteComment={() => {}}
                        onSavePost={() => handleUnsavePost(selectedPost.url)}
                        onSharePost={() => handleSharePost(selectedPost)}
                        isSavedPost={true}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
