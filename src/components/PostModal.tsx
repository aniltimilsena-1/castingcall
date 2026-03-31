import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, Bookmark, Crown, ArrowLeft, MoreVertical, Share, Flag, Trash2, Play, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedItem, Comment } from "@/types/feed";

export interface PostModalProps {
    item: FeedItem;
    likeData: { count: number; liked: boolean };
    commentList: Comment[];
    commentLikes: Record<string, { count: number; liked: boolean }>;
    replyingTo: { id: string; commenter: string; photoUrl: string } | null;
    isMuted: boolean;
    onToggleMute: () => void;
    onLikeComment: (cid: string) => void;
    onReply: (cid: string, commenter: string) => void;
    onCancelReply: () => void;
    commentValue: string;
    isPostingComment: boolean;
    onClose: () => void;
    onLike: () => void;
    onCommentChange: (v: string) => void;
    onCommentSubmit: () => void;
    onDeleteComment: (commentId: string) => void;
    onProfileClick?: (profile: any) => void;
    onSavePost: () => void;
    onSharePost: () => void;
    isSavedPost: boolean;
}

export default function PostModal({ 
    item, likeData, commentList, commentLikes, replyingTo, isMuted, onToggleMute, onLikeComment, onReply, onCancelReply,
    commentValue, isPostingComment, onClose, onLike, onCommentChange, onCommentSubmit, 
    onDeleteComment, onProfileClick, onSavePost, onSharePost, isSavedPost 
}: PostModalProps) {
    const { user, profile: currentUserProfile } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const timeAgo = (date: string) => {
        const sec = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
        if (sec < 60) return `${sec}s ago`;
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
        return `${Math.floor(sec / 86400)}d ago`;
    };

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
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    onClick={() => { onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan }); onClose(); }}
                >
                    <div className="w-9 h-9 rounded-full bg-secondary border-2 border-primary overflow-hidden flex-shrink-0 flex items-center justify-center font-display text-sm text-primary">
                        {item.owner.photo_url
                            ? <img src={item.owner.photo_url} className="w-full h-full object-cover" alt="" />
                            : (item.owner.name?.[0] || "?").toUpperCase()
                        }
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                            {item.owner.name}
                            {(item.owner.plan === "pro" || item.owner.role === "Admin") && <Crown size={12} className="text-amber-500 fill-amber-500/10" />}
                        </div>
                        <div className="text-[0.65rem] text-primary/70">{item.owner.role || "Member"}</div>
                    </div>
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onLike}
                        className={`flex items-center gap-1 p-2 transition-all ${likeData.liked ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
                    >
                        <Heart size={20} fill={likeData.liked ? "currentColor" : "none"} />
                        {likeData.count > 0 && <span className="text-sm font-normal">{likeData.count}</span>}
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 text-muted-foreground hover:text-primary transition-colors outline-none">
                                <MoreVertical size={20} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-card border-border p-1.5 shadow-2xl z-[600]">
                            <DropdownMenuItem 
                                onClick={onSavePost}
                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-foreground/5 cursor-pointer text-xs"
                            >
                                <Bookmark size={16} className={isSavedPost ? "text-primary fill-primary" : "text-muted-foreground"} /> 
                                {isSavedPost ? "Remove from Saved" : "Save this Post"}
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                onClick={onSharePost}
                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-foreground/5 cursor-pointer text-xs"
                            >
                                <Share size={16} className="text-muted-foreground" /> Share to...
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-red-500/10 cursor-pointer text-xs text-red-400"
                                onClick={() => toast.info("Report feature coming soon")}
                            >
                                <Flag size={16} /> Report Content
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* ── Media ── */}
            <div className="bg-black flex-1 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 z-0">
                    {item.type === "photo" ? (
                        <img src={item.url} className="w-full h-full object-cover blur-3xl opacity-30 scale-125" alt="" />
                    ) : (
                        <video src={item.url} className="w-full h-full object-cover blur-3xl opacity-30 scale-125" muted />
                    )}
                </div>

                {item.type === "photo" ? (
                    <img
                        src={item.url}
                        alt={item.caption || "Post"}
                        className="relative z-10 w-full h-full object-contain max-h-[70vh] md:max-h-full"
                    />
                ) : (
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <video
                            ref={videoRef}
                            src={item.url}
                            className="w-full h-full object-contain max-h-[70vh] md:max-h-full"
                            loop playsInline
                            muted={isMuted}
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
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                            className="absolute bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all shadow-xl"
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>
                )}
            </div>

            {/* Caption */}
            {item.caption && (
                <div className="px-4 py-3 border-b border-border/30 flex-shrink-0 bg-card">
                    <span className="text-sm"><span className="font-bold mr-1.5">{item.owner.name}</span>{item.caption}</span>
                </div>
            )}

            {/* ── Comments ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-background">
                {commentList.length === 0 && (
                    <p className="text-center text-muted-foreground/50 text-sm py-6 italic font-body">No comments yet — be the first!</p>
                )}
                {commentList.filter(c => !c.parent_id).map((c) => (
                    <div key={c.id} className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center text-[0.65rem] font-bold text-primary">
                                {c.commenter_photo
                                    ? <img src={c.commenter_photo} className="w-full h-full object-cover" alt="" />
                                    : c.commenter?.[0]?.toUpperCase()
                                }
                            </div>
                            <div className="flex-1 bg-secondary/20 rounded-2xl px-3 py-2 group/comment relative border border-border/10">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-foreground mr-1.5">{c.commenter}</span>
                                    {(user?.id === c.user_id || currentUserProfile?.role === 'Admin') && (
                                        <button
                                            onClick={() => onDeleteComment(c.id)}
                                            className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-foreground/80 break-words font-body">{c.content}</span>
                                
                                <div className="flex items-center gap-3 text-[0.6rem] text-muted-foreground/50 mt-1.5 font-bold uppercase tracking-widest">
                                    <span>{timeAgo(c.created_at)}</span>
                                    <button onClick={() => onLikeComment(c.id)} className={`flex items-center gap-1 hover:text-foreground transition-colors ${commentLikes[c.id]?.liked ? 'text-rose-500' : ''}`}>
                                        <Heart size={10} fill={commentLikes[c.id]?.liked ? "currentColor" : "none"} />
                                        {commentLikes[c.id]?.count || 0}
                                    </button>
                                    <button onClick={() => onReply(c.id, c.commenter)} className="hover:text-foreground transition-colors">Reply</button>
                                </div>
                            </div>
                        </div>

                        {commentList.filter(r => r.parent_id === c.id).length > 0 && (
                            <div className="flex flex-col gap-3 pl-11">
                                {commentList.filter(r => r.parent_id === c.id).map(r => (
                                    <div key={r.id} className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center text-[0.55rem] font-bold text-primary">
                                            {r.commenter_photo ? <img src={r.commenter_photo} className="w-full h-full object-cover" alt="" /> : r.commenter?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 bg-secondary/10 rounded-xl px-2.5 py-1.5 group/reply relative border border-border/5 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[0.65rem] text-foreground mr-1.5">{r.commenter}</span>
                                                {(user?.id === r.user_id || currentUserProfile?.role === 'Admin') && (
                                                    <button
                                                        onClick={() => onDeleteComment(r.id)}
                                                        className="opacity-0 group-hover/reply:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-[0.65rem] text-foreground/80 break-words font-body">{r.content}</span>
                                            
                                            <div className="flex items-center gap-3 text-[0.55rem] text-muted-foreground/50 mt-1 font-bold">
                                                <span>{timeAgo(r.created_at)}</span>
                                                <button onClick={() => onLikeComment(r.id)} className={`flex items-center gap-1 hover:text-foreground transition-colors ${commentLikes[r.id]?.liked ? 'text-rose-500' : ''}`}>
                                                    <Heart size={8} fill={commentLikes[r.id]?.liked ? "currentColor" : "none"} />
                                                    {commentLikes[r.id]?.count || 0}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Comment Input */}
            <div className="flex flex-col px-4 py-3 border-t border-border bg-card flex-shrink-0" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between gap-4 bg-primary/10 text-primary px-3 py-1.5 rounded-t-xl text-[0.65rem] font-bold mb-2 border-x border-t border-primary/20 overflow-hidden"
                        >
                            <span>Replying to <span className="font-black">@{replyingTo.commenter}</span></span>
                            <button type="button" onClick={onCancelReply} className="hover:text-primary/70 transition-colors bg-primary/20 rounded-full p-0.5"><X size={12} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={commentValue}
                        onChange={(e) => onCommentChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isPostingComment && onCommentSubmit()}
                        placeholder={replyingTo ? `Replying to @${replyingTo.commenter}...` : "Write a comment…"}
                        className="flex-1 bg-secondary/30 border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary transition-all placeholder:text-muted-foreground/30 font-body shadow-inner"
                    />
                    <button
                        onClick={onCommentSubmit}
                        disabled={!commentValue.trim() || !!isPostingComment}
                        className="p-2.5 bg-primary text-primary-foreground rounded-full disabled:opacity-100 disabled:bg-white/[0.04] disabled:text-white/20 disabled:border-white/[0.05] disabled:cursor-not-allowed hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        {isPostingComment ? <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" /> : <Send size={18} fill="currentColor" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
