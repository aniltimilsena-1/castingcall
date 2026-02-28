import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Activity, Search, Star, CheckCircle2, MoreVertical, Ban, UserCheck, ArrowUpRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Profile = Tables<"profiles">;

export default function AdminPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            toast.error("Failed to fetch profiles");
        } else {
            setProfiles(data || []);
        }
        setLoading(false);
    };

    const filteredProfiles = profiles.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleVerification = async (profile: Profile) => {
        const newStatus = !(profile as any).is_verified;
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ is_verified: newStatus } as any)
                .eq("id", profile.id);

            if (error) throw error;

            toast.success(`${profile.name} is now ${newStatus ? 'Verified' : 'Unverified'}`);
            fetchProfiles();
        } catch (err: any) {
            toast.error("Failed to update status. Ensure 'is_verified' field exists.");
            // Fallback for demo purposes if field missing: update local state only
            setProfiles(profiles.map(p => p.id === profile.id ? { ...p, is_verified: newStatus } as any : p));
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white/90 pb-20 overflow-x-hidden">
            {/* Background Glows */}
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

            <div className="p-6 md:p-12 max-w-[1400px] mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 backdrop-blur-xl">
                                <Shield size={24} />
                            </div>
                            <div className="h-px w-12 bg-primary/20" />
                            <span className="text-[0.65rem] font-normal uppercase tracking-[4px] text-primary/60">System Admin</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-display font-normal tracking-tight text-white mb-3">
                            Control <span className="text-primary italic">Center</span>
                        </h1>
                        <p className="text-muted-foreground/60 font-body text-sm max-w-md leading-relaxed">
                            Oversee platform growth, manage talent verification, and monitor global activity in real-time.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card/30 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] flex items-center gap-6"
                    >
                        <div className="text-right">
                            <p className="text-[0.6rem] uppercase tracking-[2px] text-muted-foreground mb-1">System Health</p>
                            <p className="text-sm font-normal text-green-400 flex items-center gap-2 justify-end">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                                Operational
                            </p>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <button className="bg-primary text-black px-8 py-4 rounded-xl text-[0.7rem] font-normal uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20">
                            System Logs
                        </button>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <StatsCard
                        icon={<Users size={20} />}
                        label="Total Talents"
                        value={profiles.length.toString()}
                        trend="+12%"
                        color="primary"
                    />
                    <StatsCard
                        icon={<Star size={20} />}
                        label="Premium Users"
                        value={profiles.filter(p => p.plan === 'pro').length.toString()}
                        trend="+5%"
                        color="amber"
                    />
                    <StatsCard
                        icon={<CheckCircle2 size={20} />}
                        label="Verified Profiles"
                        value={profiles.filter(p => (p as any).is_verified).length.toString()}
                        trend="+8%"
                        color="blue"
                    />
                    <StatsCard
                        icon={<TrendingUp size={20} />}
                        label="Daily Auditions"
                        value="142"
                        trend="+24%"
                        color="green"
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card/20 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
                >
                    <div className="p-10 border-b border-white/5 bg-white/[0.02] flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div>
                            <h2 className="text-2xl font-display font-normal text-white mb-2 flex items-center gap-3">
                                <Users className="text-primary" size={24} />
                                Talent Directory
                            </h2>
                            <p className="text-xs text-muted-foreground/50 uppercase tracking-[2px]">Manage user permissions and verification status</p>
                        </div>
                        <div className="relative group w-full lg:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-background/40 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary/50 transition-all backdrop-blur-xl"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.01] text-muted-foreground/40 font-normal uppercase tracking-[3px] text-[0.6rem] border-b border-white/5">
                                    <th className="px-10 py-6">Identity</th>
                                    <th className="px-10 py-6">Verification</th>
                                    <th className="px-10 py-6">Role / Specialization</th>
                                    <th className="px-10 py-6">Location</th>
                                    <th className="px-10 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-10 py-8 bg-white/[0.01]"></td>
                                        </tr>
                                    ))
                                ) : filteredProfiles.length > 0 ? (
                                    filteredProfiles.map((p) => (
                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="relative">
                                                        <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center overflow-hidden border border-white/10 shadow-xl">
                                                            {p.photo_url ? (
                                                                <img src={p.photo_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                            ) : (
                                                                <span className="font-display text-xl text-primary">{p.name?.[0] || '?'}</span>
                                                            )}
                                                        </div>
                                                        {(p as any).is_verified && (
                                                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg border-2 border-background">
                                                                <CheckCircle2 size={12} fill="currentColor" className="text-blue-500 fill-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-normal text-white text-lg tracking-tight mb-0.5">{p.name || 'Anonymous User'}</p>
                                                        <p className="text-muted-foreground/40 text-xs font-body">{p.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <button
                                                    onClick={() => toggleVerification(p)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.65rem] font-normal uppercase tracking-widest transition-all ${(p as any).is_verified
                                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                        : 'bg-white/5 text-muted-foreground border border-white/10 hover:border-primary/40 hover:text-white'
                                                        }`}
                                                >
                                                    <UserCheck size={14} />
                                                    {(p as any).is_verified ? 'Verified' : 'Verify Talent'}
                                                </button>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-[0.65rem] font-normal uppercase tracking-widest ${p.role === 'Admin' ? 'text-purple-400' : 'text-primary'}`}>
                                                        {p.role || 'Member'}
                                                    </span>
                                                    {p.plan === 'pro' && (
                                                        <span className="text-[0.55rem] text-amber-500 font-normal tracking-[2px] uppercase">Premium Member</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <p className="text-xs text-muted-foreground/60">{p.location || 'Undisclosed'}</p>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-3 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition-all">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    <button className="p-3 bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-xl transition-all border border-red-500/5 hover:border-red-500/20">
                                                        <Ban size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-24 text-center">
                                            <div className="max-w-xs mx-auto opacity-20">
                                                <Search size={48} className="mx-auto mb-4" />
                                                <p className="text-lg italic font-body">No matching users found in our records.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function StatsCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string; trend: string; color: string }) {
    const colorClasses: any = {
        primary: "bg-primary/10 text-primary border-primary/20 shadow-primary/5",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
        green: "bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5",
    };

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-card/40 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-6 group relative overflow-hidden"
        >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-30 ${color === 'primary' ? 'bg-primary' : color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}`} />

            <div className="flex items-center justify-between">
                <div className={`p-4 rounded-2xl border ${colorClasses[color]} backdrop-blur-xl transition-transform group-hover:scale-110 shadow-lg`}>
                    {icon}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <ArrowUpRight size={12} className="text-green-400" />
                    <span className="text-[0.65rem] font-normal text-green-400 tracking-wider font-body">{trend}</span>
                </div>
            </div>
            <div>
                <p className="text-muted-foreground/60 text-[0.65rem] uppercase tracking-[3px] mb-2 font-display">{label}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-display font-normal text-white">{value}</p>
                    <span className="text-[0.65rem] text-muted-foreground/30 font-body tracking-wider uppercase">Entries</span>
                </div>
            </div>
        </motion.div>
    );
}
