import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Heart, MessageCircle, Bookmark, Edit2, Trash2, Send, Crown, UserPlus, Check, Share2, CheckCircle2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { PhotoViewer } from "./SearchPage";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";

type Profile = Tables<"profiles"> & {
    mood_tags?: string[];
    style_tags?: string[];
    personality_traits?: string[];
    looks_like?: string[];
    trending_score?: number;
};

interface ProfileDetailDialogProps {
    profile: Profile | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: any;
    currentUserProfile: any;
    isSaved: boolean;
    onToggleSave: (e: React.MouseEvent, profileId: string) => void;
}

export default function ProfileDetailDialog({
    profile,
    open,
    onOpenChange,
    user,
    currentUserProfile,
    isSaved,
    onToggleSave
}: ProfileDetailDialogProps) {
    const [showFullProfile, setShowFullProfile] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
    const [isMessaging, setIsMessaging] = useState(false);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const [userProjects, setUserProjects] = useState<any[]>([]);
    const [isInviting, setIsInviting] = useState(false);
    const [invitingProjectId, setInvitingProjectId] = useState<string | null>(null);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [alreadyAppliedOrInvited, setAlreadyAppliedOrInvited] = useState<string[]>([]);

    // Track Profile View for Analytics
    useEffect(() => {
        if (open && profile?.id) {
            const trackView = async () => {
                try {
                    await supabase.from("profile_views" as any).insert({
                        profile_id: profile.id,
                        viewer_id: user?.id || null,
                    } as any);
                } catch (err) {
                    console.error("Failed to track view:", err);
                }
            };
            trackView();

            if (user && (currentUserProfile?.role === "Producer" || currentUserProfile?.role === "Director" || currentUserProfile?.role === "Casting Director" || currentUserProfile?.role === "Admin")) {
                const fetchProjects = async () => {
                    setLoadingProjects(true);
                    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).eq("status", "active");
                    setUserProjects(data || []);

                    if (data?.length) {
                        const projectIds = data.map(p => p.id);
                        const { data: apps } = await supabase.from("applications" as any).select("project_id").in("project_id", projectIds).eq("applicant_id", profile.user_id) as any;
                        setAlreadyAppliedOrInvited(apps?.map((a: any) => a.project_id) || []);
                    }
                    setLoadingProjects(false);
                };
                fetchProjects();
            }
        }
    }, [open, profile?.id, user?.id, currentUserProfile?.role]);

    const handleInvite = async (projectId: string) => {
        if (!user || alreadyAppliedOrInvited.includes(projectId)) return;
        setInvitingProjectId(projectId);
        try {
            const { error } = await supabase.from("applications" as any).insert({
                project_id: projectId,
                applicant_id: profile.user_id,
                status: "invited"
            });
            if (error) throw error;

            // Send Notification
            await supabase.from("notifications" as any).insert({
                user_id: profile.user_id,
                actor_id: user.id,
                title: "New Project Invitation",
                message: `${currentUserProfile?.name || 'Someone'} invited you to their project: ${userProjects.find(p => p.id === projectId)?.title}`,
                is_read: false
            });

            toast.success("Invitation sent!");
            setAlreadyAppliedOrInvited(prev => [...prev, projectId]);
        } catch (err: any) {
            toast.error(err.message || "Failed to invite");
        } finally {
            setInvitingProjectId(null);
        }
    };

    const handleSendMessage = async () => {
        if (!user) {
            toast.error("Please log in to send messages");
            return;
        }
        if (!message.trim()) return;

        setSending(true);
        try {
            const { error } = await supabase.from("messages").insert({
                sender_id: user.id,
                receiver_id: profile.user_id,
                content: message.trim(),
            });

            if (error) throw error;

            toast.success("Message sent successfully!");
            setMessage("");
            setIsMessaging(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const trackPortfolioInteraction = async (url: string, type: 'photo' | 'video' = 'photo') => {
        try {
            await supabase.from("portfolio_interactions" as any).insert({
                user_id: profile.user_id,
                interactor_id: user?.id || null,
                item_url: url,
                item_type: type
            } as any);
        } catch (err) {
            console.error("Failed to track interaction:", err);
        }
    };

    if (!profile) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setShowFullProfile(false); }}>
                <DialogContent className="max-w-4xl w-full bg-background p-0 border-none shadow-2xl rounded-3xl flex flex-col" style={{ maxHeight: '95svh', height: 'auto' }}>
                    <div
                        className="overflow-y-auto overscroll-contain"
                        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                    >
                        <div className="p-5 md:p-8">
                            {!showFullProfile ? (
                                /* Mini Profile View */
                                <div className="space-y-8">
                                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                        <div className="flex flex-col items-center gap-3 flex-shrink-0">
                                            <div className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-secondary border-[3px] border-primary flex items-center justify-center font-display text-4xl md:text-5xl text-primary shadow-xl shadow-primary/10 overflow-hidden">
                                                {profile?.photo_url ? (
                                                    <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    (profile?.name || "U")[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="font-display text-lg text-white uppercase tracking-wider flex items-center gap-2">
                                                {profile?.name}
                                                {(profile?.plan === 'pro' || profile?.role === 'Admin') && <Crown size={14} className="text-amber-500 fill-amber-500/10" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 text-center md:text-left pt-4">
                                            <h2 className="font-display text-4xl text-white mb-2 flex items-center gap-3">
                                                {profile?.name || "Unknown"}
                                                {(profile?.plan === 'pro' || profile?.role === 'Admin') && <Crown size={24} className="text-amber-500 fill-amber-500/10" />}
                                                {(profile as any).is_verified && <CheckCircle2 size={20} className="text-blue-500 fill-blue-500/10" />}
                                            </h2>
                                            <div className="text-xl text-primary font-medium mb-4">{profile?.role || "Member"}</div>

                                            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                                                <span className="text-xs font-normal px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
                                                    {(profile?.plan === "pro" || profile?.role === "Admin") ? (profile?.role === "Admin" ? "ADMIN PRO" : "PRO MEMBER") : "FREE MEMBER"}
                                                </span>
                                                {profile?.experience_years !== null && (
                                                    <span className="text-xs font-medium px-3 py-1 bg-secondary border border-border rounded-full text-muted-foreground">
                                                        ⭐ {profile?.experience_years}y Experience
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-lg text-foreground/70 leading-relaxed mb-6 max-w-lg">
                                                {profile?.bio || "This user hasn't added a bio yet."}
                                            </p>

                                            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-8">
                                                {(profile as any).mood_tags?.map((t: string) => (
                                                    <Badge key={t} variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-normal uppercase tracking-tighter text-[0.6rem]">{t}</Badge>
                                                ))}
                                                {(profile as any).personality_traits?.map((t: string) => (
                                                    <Badge key={t} variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-normal uppercase tracking-tighter text-[0.6rem]">{t}</Badge>
                                                ))}
                                                {(profile as any).looks_like?.slice(0, 3).map((t: string) => (
                                                    <Badge key={t} variant="outline" className="border-primary/30 text-primary/70 font-normal uppercase tracking-tighter text-[0.6rem] flex items-center gap-1">
                                                        <Sparkles size={10} /> {t}
                                                    </Badge>
                                                ))}
                                                {(profile as any).trending_score > 80 && (
                                                    <Badge className="bg-orange-500 text-white border-none font-normal tracking-widest text-[0.6rem]"><TrendingUp size={10} className="mr-1" /> Trending</Badge>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                                <button
                                                    onClick={() => setShowFullProfile(true)}
                                                    className="bg-primary text-primary-foreground px-10 py-3.5 rounded-xl font-normal text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                                                >
                                                    View All Profile Details
                                                </button>
                                                {user?.id !== profile.user_id && (
                                                    <button
                                                        onClick={() => setIsMessaging(!isMessaging)}
                                                        className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border ${isMessaging ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-white hover:border-primary'}`}
                                                    >
                                                        <MessageCircle size={18} />
                                                        {isMessaging ? "Cancel Message" : "Send Message"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => onToggleSave(e, profile.id)}
                                                    className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border ${isSaved ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-white hover:border-primary'}`}
                                                >
                                                    <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
                                                    {isSaved ? "Saved to List" : "Save Talent"}
                                                </button>

                                                {user?.id !== profile.user_id && userProjects.length > 0 && (
                                                    <button
                                                        onClick={() => setIsInviting(!isInviting)}
                                                        className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border ${isInviting ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-white hover:border-primary'}`}
                                                    >
                                                        <UserPlus size={18} />
                                                        Invite to Project
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/?profile=${profile.id}`;
                                                        navigator.clipboard.writeText(url);
                                                        toast.success("Profile link copied to clipboard!");
                                                    }}
                                                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border bg-secondary border-border text-white hover:border-primary"
                                                >
                                                    <Share2 size={18} />
                                                    Share Profile
                                                </button>
                                            </div>

                                            {isInviting && (
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 space-y-4 text-left bg-card border border-border p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="text-[0.65rem] font-normal text-primary tracking-[2.5px] uppercase">Select Active Project</div>
                                                        <button onClick={() => setIsInviting(false)} className="text-muted-foreground hover:text-white transition-colors"><X size={16} /></button>
                                                    </div>
                                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                        {userProjects.map((p) => {
                                                            const isDone = alreadyAppliedOrInvited.includes(p.id);
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    disabled={isDone || invitingProjectId === p.id}
                                                                    onClick={() => handleInvite(p.id)}
                                                                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${isDone ? 'bg-green-500/5 border-green-500/20 text-green-500/60 cursor-default' : 'bg-secondary/40 border-border/50 text-white hover:border-primary hover:bg-primary/5'}`}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-xs text-primary">{p.title[0]}</div>
                                                                        <span className="text-sm font-normal truncate max-w-[200px]">{p.title}</span>
                                                                    </div>
                                                                    {isDone ? <Check size={16} /> : invitingProjectId === p.id ? <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {isMessaging && !showFullProfile && (
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 space-y-4 text-left bg-secondary/30 p-6 rounded-[2rem] border border-border/50 shadow-inner">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                        <div className="text-[0.65rem] font-normal text-primary tracking-[2.5px] uppercase">Direct Message</div>
                                                    </div>
                                                    <div className="relative">
                                                        <textarea
                                                            value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                            placeholder={`Aa`}
                                                            className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary/50 transition-all resize-none h-28"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => setIsMessaging(false)}
                                                            className="px-5 py-2 text-xs font-normal text-muted-foreground hover:text-white transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleSendMessage}
                                                            disabled={sending || !message.trim()}
                                                            className="bg-primary text-primary-foreground px-8 py-2.5 rounded-full font-normal text-xs flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 gold-glow"
                                                        >
                                                            {sending ? "Sending..." : "Send"}
                                                            <Send size={14} className="fill-primary-foreground" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Full Profile View - Detailed Layout */
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                                    <div className="flex items-center justify-between border-b border-border pb-6">
                                        <div className="flex items-center gap-4">
                                            <h2 className="font-display text-3xl text-white flex items-center gap-3">
                                                {profile?.name}
                                                {(profile?.plan === 'pro' || profile?.role === 'Admin') && <Crown size={20} className="text-amber-500 fill-amber-500/10" />}
                                            </h2>
                                            {user?.id !== profile.user_id && (
                                                <button
                                                    onClick={() => setIsMessaging(!isMessaging)}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-normal transition-all border ${isMessaging ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary/40 border-border text-muted-foreground hover:border-primary'}`}
                                                >
                                                    <MessageCircle size={14} />
                                                    {isMessaging ? "Discard Message" : "Message"}
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => { setShowFullProfile(false); setIsMessaging(false); }} className="text-sm font-normal text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                                            <span>←</span> Back to summary
                                        </button>
                                    </div>

                                    {isMessaging && showFullProfile && (
                                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-secondary/30 border border-primary/20 rounded-3xl p-8 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[0.7rem] font-normal text-primary tracking-[3px] uppercase">New Message to {profile.name}</div>
                                                <button onClick={() => setIsMessaging(false)} className="text-muted-foreground hover:text-primary transition-colors">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <textarea
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder={`Write your message here...`}
                                                className="w-full bg-background border border-border rounded-xl px-6 py-5 text-sm text-foreground outline-none focus:border-primary/50 transition-all resize-none h-40"
                                            />
                                            <div className="flex justify-end items-center gap-6">
                                                <button onClick={() => setIsMessaging(false)} className="text-sm font-normal text-muted-foreground hover:text-white transition-colors">Cancel</button>
                                                <button
                                                    onClick={handleSendMessage}
                                                    disabled={sending || !message.trim()}
                                                    className="bg-primary text-primary-foreground px-10 py-4 rounded-xl font-normal text-sm flex items-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xl shadow-primary/20"
                                                >
                                                    {sending ? "Sending..." : "Send Direct Message"}
                                                    <Send size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-4 space-y-6">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="aspect-square w-full rounded-2xl bg-secondary border-2 border-primary overflow-hidden shadow-2xl">
                                                    {profile?.photo_url ? (
                                                        <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-display text-7xl text-primary">
                                                            {(profile?.name || "U")[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <h2 className="font-display text-2xl text-white">{profile?.name}</h2>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-8 space-y-10">
                                            <div>
                                                <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Photos
                                                </h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {(profile as any)?.photos?.length > 0 ? (
                                                        (profile as any).photos.map((url: string, i: number) => (
                                                            <div key={i} onClick={() => { setViewingPhoto(url); trackPortfolioInteraction(url); }} className="aspect-square rounded-xl overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group relative">
                                                                <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground/30 text-sm italic">No additional photos uploaded</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-6 bg-secondary/10 p-8 rounded-3xl border border-border/50">
                                                <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-2">Basic Information</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <Detail label="FULL NAME" value={profile?.name} />
                                                    <Detail label="PRIMARY ROLE" value={profile?.role} />
                                                    <Detail label="LOCATION" value={profile?.location} />
                                                    <Detail label="EMAIL" value={profile?.email} />
                                                </div>
                                                <div className="pt-6 border-t border-border/20">
                                                    <Detail label="BIO" value={profile?.bio || "No professional summary provided."} fullWidth />
                                                </div>
                                                <div className="pt-6 border-t border-border/20">
                                                    <h4 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-primary mb-4 flex items-center gap-2">
                                                        <Sparkles size={14} /> Smart Search Tags
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <Detail label="VISUAL MOODS" value={(profile as any).mood_tags?.join(', ')} />
                                                        <Detail label="STYLE AESTHETIC" value={(profile as any).style_tags?.join(', ')} />
                                                        <Detail label="PERSONALITY" value={(profile as any).personality_traits?.join(', ')} />
                                                        <Detail label="LOOKS LIKE" value={(profile as any).looks_like?.join(', ')} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {(profile?.height || profile?.age || profile?.gender || profile?.hair_color || profile?.eye_color) && (
                                            <div className="space-y-6">
                                                <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Physical Attributes</h3>
                                                <div className="grid grid-cols-2 gap-8 bg-card border border-border p-8 rounded-3xl shadow-sm">
                                                    <Detail label="HEIGHT" value={profile?.height} />
                                                    <Detail label="AGE" value={profile?.age ? `${profile.age} Years` : null} />
                                                    <Detail label="GENDER" value={profile?.gender} />
                                                    <Detail label="HAIR COLOR" value={profile?.hair_color} />
                                                    <Detail label="EYE COLOR" value={profile?.eye_color} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-10">
                                            {(profile?.experience_years !== null || profile?.portfolio_url) && (
                                                <div>
                                                    <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Professional Experience</h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-card border border-border p-8 rounded-3xl shadow-sm">
                                                        <Detail label="YEARS OF EXPERIENCE" value={profile?.experience_years !== null ? `${profile?.experience_years} Years` : null} />
                                                        <Detail label="PORTFOLIO URL" value={profile?.portfolio_url} isLink />
                                                    </div>
                                                </div>
                                            )}
                                            {profile?.skills && profile.skills.length > 0 && (
                                                <div>
                                                    <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Skills & Specialties</h3>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {profile.skills.map((skill) => (
                                                            <span key={skill} className="bg-primary/5 text-primary text-[0.75rem] font-medium px-4 py-2 rounded-xl border border-primary/20 shadow-sm shadow-primary/5">{skill}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>{/* end scrollable body */}
                </DialogContent >
            </Dialog >
            <PhotoViewer
                url={viewingPhoto}
                onClose={() => setViewingPhoto(null)}
                user={user}
                currentUserProfile={currentUserProfile}
                photoOwnerId={profile?.user_id}
            />
        </>
    );
}

function Detail({ label, value, fullWidth = false, isLink = false }: {
    label: string;
    value: string | number | null | undefined;
    fullWidth?: boolean;
    isLink?: boolean;
}) {
    if (!value) return null;
    return (
        <div className={fullWidth ? "col-span-full" : ""}>
            <div className="text-[0.65rem] font-normal text-muted-foreground tracking-[2px] uppercase mb-1.5 opacity-50">{label}</div>
            {isLink ? (
                <a href={value.toString()} target="_blank" rel="noopener noreferrer" className="text-sm font-normal text-primary hover:underline break-all">
                    {value}
                </a>
            ) : (
                <div className="text-sm font-normal text-foreground/90 leading-relaxed">{value}</div>
            )}
        </div>
    );
}
