import { useState, useEffect } from "react";
import { profileService, Profile } from "@/services/profileService";
import { paymentService } from "@/services/paymentService";
import { messageService } from "@/services/messageService";
import { followService, FollowProfile } from "@/services/followService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Heart, MessageCircle, Bookmark, Edit2, Trash2, Send, Crown, UserPlus, Check, Share2, CheckCircle2, ShoppingBag, Gift, Sparkles, TrendingUp, Lock, MoreVertical, UserCheck, Users } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { PhotoViewer } from "./SearchPage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import PaymentUpgradeDialog from "./PaymentUpgradeDialog";
import { Flag, MoreHorizontal } from "lucide-react";

// Profile type imported from profileService

interface ProfileDetailDialogProps {
    profile: Profile | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: any;
    currentUserProfile: any;
    isSaved: boolean;
    onToggleSave: (e: React.MouseEvent, profileId: string) => void;
    isOnline?: boolean;
    onDirectMessage?: () => void;
}

export default function ProfileDetailDialog({
    profile,
    open,
    onOpenChange,
    user,
    currentUserProfile,
    isSaved,
    onToggleSave,
    isOnline = false,
    onDirectMessage
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

    // ── Monetization States
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [digitalProducts, setDigitalProducts] = useState<any[]>([]);
    const [loadingMonetization, setLoadingMonetization] = useState(false);

    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        type: 'pro' | 'fan_pass' | 'unlock' | 'product' | 'tip';
        amount: number;
        metadata: any;
        currency?: string;
        currencySymbol?: string;
    }>({ open: false, type: 'fan_pass', amount: 0, metadata: {} });

    const [isNepal, setIsNepal] = useState<boolean | null>(null);

    // ── Follow State
    const [isFollowingProfile, setIsFollowingProfile] = useState(false);
    const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
    const [followLoading, setFollowLoading] = useState(false);
    const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
    const [followList, setFollowList] = useState<FollowProfile[]>([]);
    const [followListLoading, setFollowListLoading] = useState(false);

    const openFollowModal = async (type: "followers" | "following") => {
        setFollowModal(type);
        setFollowListLoading(true);
        try {
            const list = type === "followers"
                ? await followService.getFollowers(profile!.user_id)
                : await followService.getFollowing(profile!.user_id);
            setFollowList(list);
        } catch {
            toast.error("Failed to load list");
        } finally {
            setFollowListLoading(false);
        }
    };

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

    useEffect(() => {
        if (open && profile?.id) {
            profileService.trackProfileView(profile.id, user?.id);
        }
    }, [open, profile?.id, user?.id]);

    // Load follow state whenever dialog opens
    useEffect(() => {
        if (!open || !profile?.user_id) return;
        const loadFollowData = async () => {
            const counts = await followService.getCounts(profile.user_id);
            setFollowCounts(counts);
            if (user?.id && user.id !== profile.user_id) {
                const following = await followService.isFollowing(user.id, profile.user_id);
                setIsFollowingProfile(following);
            }
        };
        loadFollowData();
    }, [open, profile?.user_id, user?.id]);

    const handleToggleFollow = async () => {
        if (!user) { toast.error("Sign in to follow"); return; }
        if (!profile?.user_id) return;
        setFollowLoading(true);
        try {
            if (isFollowingProfile) {
                await followService.unfollow(user.id, profile.user_id);
                setIsFollowingProfile(false);
                setFollowCounts(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
                toast.info("Unfollowed");
            } else {
                await followService.follow(user.id, profile.user_id);
                setIsFollowingProfile(true);
                setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
                toast.success("Following!");
            }
        } catch (err: any) {
            toast.error(err.message || "Action failed");
        } finally {
            setFollowLoading(false);
        }
    };

    useEffect(() => {
        if (open && profile?.id) {
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
    }, [open, profile?.id, user, currentUserProfile?.role]);

    useEffect(() => {
        if (open && profile?.user_id) {
            const loadMonetization = async () => {
                setLoadingMonetization(true);
                try {
                    if (user) {
                        const subbed = await paymentService.verifySubscription(user.id, profile.user_id);
                        setIsSubscribed(subbed);
                    }
                    const products = await profileService.getDigitalProducts(profile.user_id);
                    setDigitalProducts(products);
                } catch (err) {
                    console.error("Monetization load error:", err);
                } finally {
                    setLoadingMonetization(false);
                }
            };
            loadMonetization();
        }
    }, [open, profile?.user_id, user]);

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
            await supabase.from("notifications").insert({
                user_id: profile.user_id,
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
        if (!message.trim() || !user || !profile?.user_id) return;
        setSending(true);
        try {
            await messageService.sendMessage(user.id, profile.user_id, message);
            toast.success("Message sent successfully!");
            setMessage("");
            setIsMessaging(false);
        } catch (err) {
            toast.error("Failed to send message.");
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

    const handleSubscribe = async () => {
        if (!user) { toast.error("Sign in to subscribe"); return; }
        if (isSubscribed) { toast.info("You're already a fan!"); return; }

        setPaymentModal({
            open: true,
            type: 'fan_pass',
            amount: isNepal ? 199 : 1.99,
            currency: isNepal ? 'NPR' : 'USD',
            currencySymbol: isNepal ? 'NPR ' : '$',
            metadata: { talent_id: profile.user_id }
        });
    };

    const handleBuyProduct = (product: any) => {
        setPaymentModal({
            open: true,
            type: 'product',
            amount: product.price,
            metadata: { product_id: product.id, talent_id: profile.user_id, title: product.title }
        });
    };

    const handleSendGift = () => {
        setPaymentModal({
            open: true,
            type: 'tip',
            amount: isNepal ? 100 : 1.00,
            currency: isNepal ? 'NPR' : 'USD',
            currencySymbol: isNepal ? 'NPR ' : '$',
            metadata: { talent_id: profile.user_id }
        });
    };

    if (!profile) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setShowFullProfile(false); }}>
                <DialogContent className="max-w-4xl w-full bg-background p-0 border-none shadow-2xl rounded-3xl flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
                    <div
                        className="flex-1 overflow-y-auto overscroll-contain no-scrollbar"
                        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                    >
                        <div className="p-5 md:p-8">
                            {!showFullProfile ? (
                                /* Mini Profile View */
                                <div className="space-y-8">
                                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                        <div className="flex flex-col items-center gap-3 flex-shrink-0">
                                            <div className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-secondary border-[3px] border-primary flex items-center justify-center font-display text-4xl md:text-5xl text-primary shadow-xl shadow-primary/10 overflow-hidden relative">
                                                {profile?.photo_url ? (
                                                    <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    (profile?.name || "U")[0].toUpperCase()
                                                )}
                                                {isOnline && (
                                                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-[3px] border-secondary rounded-full z-20 shadow-glow shadow-green-500/50" title="Online" />
                                                )}
                                            </div>

                                        </div>
                                        <div className="flex-1 text-center md:text-left pt-4">
                                            <h2 className="font-display text-4xl text-foreground mb-2 flex items-center gap-3">
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

                                            {/* ── Follow counts ── */}
                                            <div className="flex items-center gap-6 mb-6">
                                                <button onClick={() => openFollowModal("followers")} className="flex flex-col items-center md:items-start hover:opacity-70 transition-opacity">
                                                    <span className="text-xl font-display text-foreground">{followCounts.followers.toLocaleString()}</span>
                                                    <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Followers</span>
                                                </button>
                                                <div className="w-px h-8 bg-border" />
                                                <button onClick={() => openFollowModal("following")} className="flex flex-col items-center md:items-start hover:opacity-70 transition-opacity">
                                                    <span className="text-xl font-display text-foreground">{followCounts.following.toLocaleString()}</span>
                                                    <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Following</span>
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                                <button
                                                    onClick={() => setShowFullProfile(true)}
                                                    className="bg-primary text-primary-foreground px-10 py-3.5 rounded-xl font-normal text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                                                >
                                                    View All Profile Details
                                                </button>
                                                {/* ── Follow Button ── */}
                                                {user?.id !== profile.user_id && (
                                                    <button
                                                        onClick={handleToggleFollow}
                                                        disabled={followLoading}
                                                        className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border shadow-lg ${
                                                            isFollowingProfile
                                                                ? 'bg-primary/10 border-primary text-primary hover:bg-red-500/10 hover:border-red-500 hover:text-red-400'
                                                                : 'bg-primary border-primary text-primary-foreground hover:opacity-90 shadow-primary/20'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {isFollowingProfile ? <UserCheck size={18} /> : <Users size={18} />}
                                                        {followLoading ? '...' : isFollowingProfile ? 'Following' : 'Follow'}
                                                    </button>
                                                )}
                                                {user?.id !== profile.user_id && (
                                                    <button
                                                        onClick={() => {
                                                            if (onDirectMessage) onDirectMessage();
                                                            else setIsMessaging(!isMessaging);
                                                        }}
                                                        className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border ${isMessaging ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary border-border text-foreground hover:border-primary shadow-lg shadow-black/20'}`}
                                                    >
                                                        <MessageCircle size={18} />
                                                        {onDirectMessage ? "Message Hub" : (isMessaging ? "Cancel Message" : "Send Quick Message")}
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    {user?.id !== profile.user_id && (
                                                        <button
                                                            onClick={handleSubscribe}
                                                            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border ${isSubscribed ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-amber-500 border-amber-500 text-amber-950 hover:bg-amber-400 font-bold shadow-lg shadow-amber-500/20'}`}
                                                        >
                                                            {isSubscribed ? <Check size={18} /> : <Crown size={18} />}
                                                            {isSubscribed ? "Active Fan Pass" : "Get Fan Pass"}
                                                        </button>
                                                    )}

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary border border-border text-foreground hover:border-primary transition-all outline-none">
                                                                <MoreVertical size={20} />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56 bg-card border-border p-1.5 shadow-2xl z-[501]">
                                                            <DropdownMenuItem
                                                                onClick={(e) => onToggleSave(e, profile.id ?? profile.user_id)}
                                                                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-xs ${isSaved ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-primary/10'}`}
                                                            >
                                                                <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                                                                <span className="font-medium">{isSaved ? "Saved to List" : "Save Talent"}</span>
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    const url = `${window.location.origin}/profile/${profile.id}`;
                                                                    navigator.clipboard.writeText(url);
                                                                    toast.success("Profile link copied!");
                                                                }}
                                                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-primary/10 cursor-pointer text-xs"
                                                            >
                                                                <Share2 size={16} />
                                                                <span className="font-medium">Share Profile</span>
                                                            </DropdownMenuItem>

                                                            {user?.id !== profile.user_id && userProjects.length > 0 && (
                                                                <DropdownMenuItem
                                                                    onClick={() => setIsInviting(!isInviting)}
                                                                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-xs ${isInviting ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-primary/10'}`}
                                                                >
                                                                    <UserPlus size={16} />
                                                                    <span className="font-medium">Invite to Project</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            <div className="h-px bg-white/5 my-1 mx-2" />

                                                            <DropdownMenuItem
                                                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-red-500/10 cursor-pointer text-xs text-red-400"
                                                                onClick={() => toast.info("Report feature coming soon")}
                                                            >
                                                                <Flag size={16} />
                                                                <span className="font-medium">Report Talent</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
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
                                                            className="px-5 py-2 text-xs font-normal text-white/40 hover:text-white transition-colors"
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
                                            <h2 className="font-display text-3xl text-foreground flex items-center gap-3">
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
                                                <button onClick={() => setIsMessaging(false)} className="text-white/40 hover:text-primary transition-colors">
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
                                                <button onClick={() => setIsMessaging(false)} className="text-sm font-normal text-white/40 hover:text-white transition-colors">Cancel</button>
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
                                                {/* Redundant name removed */}
                                                
                                                {/* Full Profile View Follow Stats & Button */}
                                                <div className="flex items-center gap-6 mt-2">
                                                    <button onClick={() => openFollowModal("followers")} className="flex flex-col items-center hover:opacity-70 transition-opacity">
                                                        <span className="text-xl font-display text-foreground">{followCounts.followers.toLocaleString()}</span>
                                                        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Followers</span>
                                                    </button>
                                                    <div className="w-px h-8 bg-border" />
                                                    <button onClick={() => openFollowModal("following")} className="flex flex-col items-center hover:opacity-70 transition-opacity">
                                                        <span className="text-xl font-display text-foreground">{followCounts.following.toLocaleString()}</span>
                                                        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Following</span>
                                                    </button>
                                                </div>
                                                
                                                {user?.id !== profile.user_id && (
                                                    <button
                                                        onClick={handleToggleFollow}
                                                        disabled={followLoading}
                                                        className={`mt-2 w-full max-w-[200px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-normal text-sm transition-all border shadow-lg ${
                                                            isFollowingProfile
                                                                ? 'bg-primary/10 border-primary text-primary hover:bg-red-500/10 hover:border-red-500 hover:text-red-400'
                                                                : 'bg-primary border-primary text-primary-foreground hover:opacity-90 shadow-primary/20'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {isFollowingProfile ? <UserCheck size={18} /> : <Users size={18} />}
                                                        {followLoading ? '...' : isFollowingProfile ? 'Following' : 'Follow'}
                                                    </button>
                                                )}
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

                                            <div>
                                                <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Video Reel
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {(profile as any)?.videos?.length > 0 ? (
                                                        (profile as any).videos.map((url: string, i: number) => (
                                                            <div key={i} onClick={() => { setViewingPhoto(url); trackPortfolioInteraction(url, 'video'); }} className="aspect-video rounded-xl overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer group relative bg-black flex items-center justify-center">
                                                                <video src={`${url}#t=0.1`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" muted playsInline />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/40 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-current border-b-[8px] border-b-transparent ml-1" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-10 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground/30 text-sm italic">No video reel uploaded</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Digital Store Section */}
                                            {digitalProducts.length > 0 && (
                                                <div className="pt-6 border-t border-border/20">
                                                    <h3 className="text-[0.7rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-6 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Digital Hub Store
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {digitalProducts.map((p) => (
                                                            <div key={p.id} className="bg-card/40 border border-border rounded-2xl overflow-hidden group hover:border-amber-500/50 transition-all">
                                                                <div className="aspect-video w-full relative bg-secondary overflow-hidden">
                                                                    {p.thumbnail_url ? (
                                                                        <img src={p.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                                            <ShoppingBag size={32} />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-normal text-amber-500 border border-amber-500/20">
                                                                        ${p.price} {p.currency}
                                                                    </div>
                                                                </div>
                                                                <div className="p-5">
                                                                    <h4 className="text-white text-sm font-normal mb-1">{p.title}</h4>
                                                                    <p className="text-muted-foreground text-xs line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                                                                    <button
                                                                        onClick={() => handleBuyProduct(p)}
                                                                        className="w-full bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-white text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <ShoppingBag size={14} className="text-amber-500" />
                                                                        Purchase Item
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

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
                    {/* ── Followers / Following Modal ── */}
                    <AnimatePresence>
                        {followModal && (
                            <>
                                <motion.div
                                    key="follow-backdrop"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] pointer-events-auto"
                                    onClick={() => setFollowModal(null)}
                                />
                                <div className="fixed inset-0 z-[2001] flex items-end md:items-center justify-center pointer-events-none p-4">
                                    <motion.div
                                        key="follow-panel"
                                        initial={{ opacity: 0, y: 100 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 100 }}
                                        transition={{ type: "spring", damping: 28, stiffness: 350 }}
                                        className="w-full max-w-md bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] pointer-events-auto"
                                    >
                                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <Users size={18} className="text-primary" />
                                                <h3 className="font-display text-lg text-white capitalize">{followModal}</h3>
                                                <span className="text-sm text-muted-foreground">
                                                    ({followModal === "followers" ? followCounts.followers : followCounts.following})
                                                </span>
                                            </div>
                                            <div
                                                onClick={(e) => { e.stopPropagation(); setFollowModal(null); }}
                                                className="text-muted-foreground hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 cursor-pointer pointer-events-auto"
                                            >
                                                <X size={20} />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-1">
                                            {followListLoading ? (
                                                <div className="flex flex-col items-center gap-3 py-16">
                                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                    <p className="text-[0.65rem] uppercase tracking-[3px] text-muted-foreground animate-pulse">Loading...</p>
                                                </div>
                                            ) : followList.length === 0 ? (
                                                <div className="flex flex-col items-center py-16 gap-3">
                                                    <Users size={36} className="text-muted-foreground/20" />
                                                    <p className="text-muted-foreground text-sm">
                                                        {followModal === "followers" ? "No followers yet." : "Not following anyone yet."}
                                                    </p>
                                                </div>
                                            ) : (
                                                followList.map((fp) => (
                                                    <div key={fp.user_id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
                                                        <div className="w-11 h-11 rounded-full bg-secondary border border-border flex-shrink-0 overflow-hidden flex items-center justify-center font-display text-xl text-primary">
                                                            {fp.photo_url
                                                                ? <img src={fp.photo_url} alt={fp.name} className="w-full h-full object-cover" />
                                                                : (fp.name || "?")[0].toUpperCase()
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-normal text-white truncate">{fp.name}</span>
                                                                {fp.plan === "pro" && <Crown size={12} className="text-amber-500 flex-shrink-0" />}
                                                            </div>
                                                            <span className="text-[0.6rem] uppercase tracking-[0.15em] text-primary/60">{fp.role}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-4 border-t border-border flex-shrink-0 bg-secondary/10">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFollowModal(null); }}
                                                className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white rounded-xl text-sm font-medium transition-all pointer-events-auto"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            </>
                        )}
                    </AnimatePresence>
                </DialogContent >
            </Dialog >
            <PhotoViewer
                url={viewingPhoto}
                onClose={() => setViewingPhoto(null)}
                user={user}
                currentUserProfile={currentUserProfile}
                photoOwnerId={profile?.user_id}
            />
            <PaymentUpgradeDialog
                open={paymentModal.open}
                onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, open }))}
                user={user}
                type={paymentModal.type}
                amount={paymentModal.amount}
                currency={paymentModal.currency}
                currencySymbol={paymentModal.currencySymbol}
                metadata={paymentModal.metadata}
                onSuccess={() => {
                    if (paymentModal.type === 'fan_pass') {
                        setIsSubscribed(true);
                    }
                }}
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
