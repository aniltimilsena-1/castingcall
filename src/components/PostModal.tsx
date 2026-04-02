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
            className="fixed inset-0 z-[500] flex flex-col bg-background selection:bg-primary/30"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* ── 1. CINEMATIC OVERLAY BAR ── */}
            <div className="absolute top-0 left-0 right-0 z-[600] flex items-center justify-between px-12 py-10 pointer-events-none">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={onClose}
                    className="p-4 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 text-white hover:text-primary transition-all active:scale-90 pointer-events-auto shadow-2xl"
                >
                    <ArrowLeft size={24} />
                </motion.button>

                <div className="flex items-center gap-4 pointer-events-auto">
                    <button 
                        onClick={onSharePost}
                        className="p-4 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 text-white hover:text-primary transition-all active:scale-90 shadow-2xl"
                    >
                        <Share size={20} />
                    </button>
                    <button 
                        onClick={onSavePost}
                        className={`p-4 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 transition-all active:scale-90 shadow-2xl ${isSavedPost ? 'text-primary' : 'text-white'}`}
                    >
                        <Bookmark size={20} fill={isSavedPost ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
                {/* ── 2. ELITE MEDIA CANVAS (LEFT) ── */}
                <div className="relative flex-1 bg-black overflow-hidden group">
                    <div className="absolute inset-0 z-0">
                        {item.type === "photo" ? (
                            <img src={item.url} className="w-full h-full object-cover blur-[100px] opacity-40 scale-150" alt="" />
                        ) : (
                            <video src={item.url} className="w-full h-full object-cover blur-[100px] opacity-40 scale-150" muted />
                        )}
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-center p-6 lg:p-12">
                        <div className="w-full h-full max-w-5xl premium-card overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border-white/5 relative">
                            {item.type === "photo" ? (
                                <img
                                    src={item.url}
                                    alt={item.caption || "Post"}
                                    className="w-full h-full object-contain bg-black/40"
                                />
                            ) : (
                                <div className="w-full h-full relative group/video">
                                    <video
                                        ref={videoRef}
                                        src={item.url}
                                        className="w-full h-full object-contain bg-black/40"
                                        loop playsInline
                                        muted={isMuted}
                                        onClick={() => {
                                            if (videoRef.current) {
                                                if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
                                                else { 
                                                    const playPromise = videoRef.current.play();
                                                    if (playPromise !== undefined) {
                                                        playPromise.then(() => setIsPlaying(true)).catch(console.error);
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                    {!isPlaying && (
                                        <button 
                                            aria-label="Play video"
                                            className="absolute inset-0 flex items-center justify-center bg-black/20"
                                            onClick={() => { 
                                                const playPromise = videoRef.current?.play();
                                                if (playPromise !== undefined) {
                                                    playPromise.then(() => setIsPlaying(true)).catch(console.error);
                                                }
                                            }}>
                                            <div className="w-20 h-20 bg-primary/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-primary/40 group-hover/video:scale-110 transition-transform">
                                                <Play size={32} fill="currentColor" className="text-primary ml-1" />
                                            </div>
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                                        aria-label={isMuted ? "Unmute video" : "Mute video"}
                                        className="absolute bottom-8 right-8 z-50 w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/80 hover:text-primary transition-all shadow-2xl"
                                    >
                                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                    </button>
                                </div>
                            )}
                            <div className="stitched-card-scanner" />
                        </div>
                    </div>

                    {/* Editorial Overlay (Bottom Left) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="absolute bottom-20 left-20 z-50 max-w-lg hidden lg:block"
                    >
                         <div className="flex items-center gap-4 mb-6">
                            <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[0.6rem] font-black uppercase tracking-[0.2em] text-primary backdrop-blur-xl">
                               Editorial Selection
                            </div>
                            <div className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-white/40">{timeAgo(item.createdAt)}</div>
                         </div>
                         <h2 className="font-display text-5xl mb-6 tracking-tighter leading-none italic">{item.caption || "Untitled Work"}</h2>
                         <button 
                            className="group flex items-center gap-6"
                            onClick={() => { onProfileClick?.({ user_id: item.owner.id, name: item.owner.name, photo_url: item.owner.photo_url, role: item.owner.role, plan: item.owner.plan }); onClose(); }}
                        >
                            <div className="w-14 h-14 rounded-full bg-primary border-4 border-black overflow-hidden shadow-2xl group-hover:scale-110 transition-transform">
                                {item.owner.photo_url 
                                    ? <img src={item.owner.photo_url} className="w-full h-full object-cover" alt="" />
                                    : <div className="w-full h-full flex items-center justify-center text-black font-display font-black text-xl">{item.owner.name?.[0]}</div>
                                }
                            </div>
                            <div className="text-left">
                                <div className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-primary mb-1">Artist Spotlight</div>
                                <div className="text-xl font-display group-hover:text-primary transition-colors">{item.owner.name}</div>
                            </div>
                         </button>
                    </motion.div>
                </div>

                {/* ── 3. ENGAGEMENT HUB (RIGHT) ── */}
                <div className="w-full lg:w-[480px] bg-secondary/30 backdrop-blur-3xl border-l border-white/5 flex flex-col relative z-50">
                    <div className="p-10 border-b border-white/5">
                         <div className="flex items-center justify-between mb-10">
                            <h3 className="font-display text-2xl">Digital <span className="text-primary italic">Critique</span></h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={onLike}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${likeData.liked ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-lg shadow-red-500/10" : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"}`}
                                >
                                    <Heart size={16} fill={likeData.liked ? "currentColor" : "none"} />
                                    <span className="text-[0.65rem] font-black uppercase tracking-widest">{likeData.count || 0}</span>
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-muted-foreground hover:text-white transition-all outline-none">
                                            <MoreVertical size={20} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-secondary border-white/5 p-2 rounded-2xl shadow-2xl backdrop-blur-3xl">
                                        <DropdownMenuItem onClick={() => toast.info("Reported")} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 cursor-pointer text-xs font-bold uppercase tracking-widest">
                                            <Flag size={14} /> Report Content
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                         </div>

                         {/* Mini Bio Section */}
                         <div className="premium-card p-6 border-white/5 bg-white/[0.02]">
                            <p className="text-xs text-muted-foreground leading-relaxed font-body font-light italic">
                                "{item.owner.role} active in the premium casting network. Verified creative talent."
                            </p>
                         </div>
                    </div>

                    {/* Comments Feed */}
                    <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar">
                        {commentList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-muted-foreground/20">
                                <Send size={40} className="mb-4" />
                                <p className="text-[0.65rem] font-black uppercase tracking-[4px]">Initiate the Conversation</p>
                            </div>
                        ) : (
                            commentList.filter(c => !c.parent_id).map((c) => (
                                <motion.div 
                                    key={c.id} 
                                    className="flex flex-col gap-4"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-secondary border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-black text-primary">
                                            {c.commenter_photo ? <img src={c.commenter_photo} className="w-full h-full object-cover" alt="" /> : c.commenter?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-display text-sm tracking-tight">{c.commenter}</span>
                                                <div className="flex items-center gap-4 text-[0.55rem] font-black uppercase tracking-widest text-muted-foreground/30">
                                                    <span>{timeAgo(c.created_at)}</span>
                                                    {(user?.id === c.user_id || currentUserProfile?.role === 'Admin') && (
                                                        <button onClick={() => onDeleteComment(c.id)} className="hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-body leading-relaxed font-light">{c.content}</p>
                                            
                                            <div className="flex items-center gap-6 text-[0.55rem] font-black uppercase tracking-widest pt-2">
                                                <button onClick={() => onLikeComment(c.id)} className={`flex items-center gap-2 hover:text-primary transition-colors ${commentLikes[c.id]?.liked ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                    <Heart size={12} fill={commentLikes[c.id]?.liked ? "currentColor" : "none"} />
                                                    {commentLikes[c.id]?.count || 0}
                                                </button>
                                                <button onClick={() => onReply(c.id, c.commenter)} className="text-muted-foreground/40 hover:text-primary transition-all">Reply</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {commentList.filter(r => r.parent_id === c.id).map(r => (
                                        <div key={r.id} className="flex gap-4 pl-14">
                                            <div className="w-8 h-8 rounded-lg bg-secondary border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-black text-primary/60">
                                                {r.commenter_photo ? <img src={r.commenter_photo} className="w-full h-full object-cover" alt="" /> : r.commenter?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-display text-xs tracking-tight text-white/50">{r.commenter}</span>
                                                    <div className="flex items-center gap-4 text-[0.5rem] font-black uppercase tracking-widest text-muted-foreground/20 italic">
                                                        {(user?.id === r.user_id || currentUserProfile?.role === 'Admin') && (
                                                            <button onClick={() => onDeleteComment(r.id)} className="hover:text-red-500 transition-colors"><Trash2 size={10} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground/60 font-body leading-relaxed">{r.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Elite Comment Input */}
                    <div className="p-10 border-t border-white/5 bg-black/20">
                        <AnimatePresence>
                            {replyingTo && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex items-center justify-between gap-4 bg-primary/10 text-primary px-6 py-4 rounded-2xl text-[0.6rem] font-black uppercase tracking-[2px] mb-4 border border-primary/20"
                                >
                                    <span>Responding to <span className="text-white italic">@{replyingTo.commenter}</span></span>
                                    <button type="button" onClick={onCancelReply} className="p-1 bg-primary/20 rounded-lg hover:bg-primary/40 transition-colors"><X size={14} /></button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div className="relative group">
                            <input
                                type="text"
                                value={commentValue}
                                onChange={(e) => onCommentChange(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !isPostingComment && onCommentSubmit()}
                                placeholder={replyingTo ? `@${replyingTo.commenter}...` : "Leave a critique…"}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-sm outline-none focus:border-primary/40 focus:bg-white/[0.08] transition-all placeholder:text-muted-foreground/20 font-body shadow-2xl"
                            />
                            <button
                                onClick={onCommentSubmit}
                                disabled={!commentValue.trim() || !!isPostingComment}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                            >
                                {isPostingComment ? <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" /> : <Send size={18} fill="currentColor" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
