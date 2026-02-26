import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Heart, MessageCircle, Bookmark, Edit2, Trash2, Send } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { PhotoViewer } from "./SearchPage";

type Profile = Tables<"profiles">;

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

    // Track Profile View for Analytics
    useEffect(() => {
        if (open && profile?.id) {
            const trackView = async () => {
                try {
                    // Record the view in Supabase
                    await supabase.from("profile_views" as any).insert({
                        profile_id: profile.id,
                        viewer_id: user?.id || null,
                    } as any);
                } catch (err) {
                    console.error("Failed to track view:", err);
                }
            };
            trackView();
        }
    }, [open, profile?.id, user?.id]);

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

    if (!profile) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setShowFullProfile(false); }}>
                <DialogContent className="max-w-4xl w-full bg-background p-0 border-none shadow-2xl rounded-3xl flex flex-col" style={{ maxHeight: '95svh', height: 'auto' }}>
                    {/* Scrollable body — THIS is the scroll container for mobile touch */}
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
                                            <div className="font-display text-lg text-white uppercase tracking-wider">{profile?.name}</div>
                                        </div>
                                        <div className="flex-1 text-center md:text-left pt-4">
                                            <h2 className="font-display text-4xl text-white mb-2">{profile?.name || "Unknown"}</h2>
                                            <div className="text-xl text-primary font-medium mb-4">{profile?.role || "Member"}</div>

                                            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                                                <span className="text-xs font-bold px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full">
                                                    {profile?.plan === "pro" ? "PRO MEMBER" : "FREE MEMBER"}
                                                </span>
                                                {profile?.experience_years !== null && (
                                                    <span className="text-xs font-medium px-3 py-1 bg-secondary border border-border rounded-full text-muted-foreground">
                                                        ⭐ {profile?.experience_years}y Experience
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-lg text-foreground/70 leading-relaxed mb-8 max-w-lg">
                                                {profile?.bio || "This user hasn't added a bio yet."}
                                            </p>

                                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                                <button
                                                    onClick={() => setShowFullProfile(true)}
                                                    className="bg-primary text-primary-foreground px-10 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                                                >
                                                    View All Profile Details
                                                </button>
                                                {user?.id !== profile.user_id && (
                                                    <button
                                                        onClick={() => setIsMessaging(!isMessaging)}
                                                        className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all border ${isMessaging ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-white hover:border-primary'}`}
                                                    >
                                                        <MessageCircle size={18} />
                                                        {isMessaging ? "Cancel Message" : "Send Message"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => onToggleSave(e, profile.id)}
                                                    className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all border ${isSaved ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-white hover:border-primary'}`}
                                                >
                                                    <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
                                                    {isSaved ? "Saved to List" : "Save Talent"}
                                                </button>
                                            </div>

                                            {isMessaging && !showFullProfile && (
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 space-y-4 text-left bg-secondary/30 p-6 rounded-[2rem] border border-border/50 shadow-inner">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                        <div className="text-[0.65rem] font-bold text-primary tracking-[2.5px] uppercase">Direct Message</div>
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
                                                            className="px-5 py-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleSendMessage}
                                                            disabled={sending || !message.trim()}
                                                            className="bg-primary text-primary-foreground px-8 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50 gold-glow"
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
                                            <h2 className="font-display text-3xl text-white">{profile?.name}</h2>
                                            {user?.id !== profile.user_id && (
                                                <button
                                                    onClick={() => setIsMessaging(!isMessaging)}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${isMessaging ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary/40 border-border text-muted-foreground hover:border-primary'}`}
                                                >
                                                    <MessageCircle size={14} />
                                                    {isMessaging ? "Discard Message" : "Message"}
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => { setShowFullProfile(false); setIsMessaging(false); }} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                                            <span>←</span> Back to summary
                                        </button>
                                    </div>

                                    {isMessaging && showFullProfile && (
                                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-secondary/30 border border-primary/20 rounded-3xl p-8 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[0.7rem] font-bold text-primary tracking-[3px] uppercase">New Message to {profile.name}</div>
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
                                                <button onClick={() => setIsMessaging(false)} className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Cancel</button>
                                                <button
                                                    onClick={handleSendMessage}
                                                    disabled={sending || !message.trim()}
                                                    className="bg-primary text-primary-foreground px-10 py-4 rounded-xl font-bold text-sm flex items-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xl shadow-primary/20"
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
                                                <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground/50 mb-4 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Photos
                                                </h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {(profile as any)?.photos?.length > 0 ? (
                                                        (profile as any).photos.map((url: string, i: number) => (
                                                            <div key={i} onClick={() => setViewingPhoto(url)} className="aspect-square rounded-xl overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group relative">
                                                                <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground/30 text-sm italic">No additional photos uploaded</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-6 bg-secondary/10 p-8 rounded-3xl border border-border/50">
                                                <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground/50 mb-2">Basic Information</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <Detail label="FULL NAME" value={profile?.name} />
                                                    <Detail label="PRIMARY ROLE" value={profile?.role} />
                                                    <Detail label="LOCATION" value={profile?.location} />
                                                    <Detail label="EMAIL" value={profile?.email} />
                                                </div>
                                                <div className="pt-6 border-t border-border/20">
                                                    <Detail label="BIO" value={profile?.bio || "No professional summary provided."} fullWidth />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {(profile?.height || profile?.age || profile?.gender || profile?.hair_color || profile?.eye_color) && (
                                            <div className="space-y-6">
                                                <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground/50 mb-4">Physical Attributes</h3>
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
                                                    <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground/50 mb-4">Professional Experience</h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-card border border-border p-8 rounded-3xl shadow-sm">
                                                        <Detail label="YEARS OF EXPERIENCE" value={profile?.experience_years !== null ? `${profile?.experience_years} Years` : null} />
                                                        <Detail label="PORTFOLIO URL" value={profile?.portfolio_url} isLink />
                                                    </div>
                                                </div>
                                            )}
                                            {profile?.skills && profile.skills.length > 0 && (
                                                <div>
                                                    <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-muted-foreground/50 mb-4">Skills & Specialties</h3>
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
                </DialogContent>
            </Dialog>
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
            <div className="text-[0.65rem] font-bold text-muted-foreground tracking-[2px] uppercase mb-1.5 opacity-50">{label}</div>
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
