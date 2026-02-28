import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Activity, Search, Star, CheckCircle2, MoreVertical, Ban, UserCheck, ArrowUpRight, TrendingUp, Briefcase, FileText, Layout, Trash2, ExternalLink, MessageCircle, Edit, Calendar, DollarSign, Clock, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

type Profile = Tables<"profiles">;
type Project = Tables<"projects">;
type FeedPost = Tables<"photo_captions">;

type AdminTab = "talents" | "projects" | "feed" | "applications" | "schedules" | "finances";

export default function AdminPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [finances, setFinances] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>("talents");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [pRes, prRes, fRes, aRes, sRes, tRes] = await Promise.all([
                supabase.from("profiles").select("*").order("created_at", { ascending: false }),
                supabase.from("projects").select("*").order("created_at", { ascending: false }),
                supabase.from("photo_captions").select("*").order("created_at", { ascending: false }),
                supabase.from("applications" as any).select("*, projects:project_id(title), profiles:applicant_id(name, email)").order("created_at", { ascending: false }),
                supabase.from("audition_slots" as any).select("*, projects:project_id(title), profiles:talent_id(name)").order("start_time", { ascending: true }),
                supabase.from("transactions" as any).select("*, profiles:user_id(name, email)").order("created_at", { ascending: false })
            ]);

            if (pRes.data) setProfiles(pRes.data);
            if (prRes.data) setProjects(prRes.data);
            if (fRes.data) setFeedPosts(fRes.data);
            if (aRes.data) setApplications(aRes.data);
            if (sRes.data) setSchedules(sRes.data);
            if (tRes.data) setFinances(tRes.data);

        } catch (err) {
            console.error("Fetch error:", err);
            toast.error("Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (table: string, id: string | number, field: string = "id") => {
        if (!confirm(`Are you sure you want to permanently delete this ${table} entry?`)) return;
        try {
            const { error } = await supabase.from(table as any).delete().eq(field, id);
            if (error) throw error;
            toast.success("Entry removed");
            fetchAllData();
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    const toggleVerification = async (profile: Profile) => {
        const currentStatus = (profile as any).is_verified || false;
        const newStatus = !currentStatus;
        try {
            setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_verified: newStatus } as any : p));
            const { error } = await supabase.from("profiles").update({ is_verified: newStatus } as any).eq("id", profile.id);
            if (error) throw error;
            toast.success(`${profile.name} updated`);
        } catch (err: any) {
            console.error("Verification toggle error:", err);
            setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_verified: currentStatus } as any : p));
            toast.error("Failed to update status");
        }
    };

    const filteredProfiles = profiles.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredProjects = projects.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFeed = feedPosts.filter(p => p.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredApps = applications.filter(a => a.projects?.title?.toLowerCase().includes(searchTerm.toLowerCase()) || a.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredSchedules = schedules.filter(s => s.projects?.title?.toLowerCase().includes(searchTerm.toLowerCase()) || s.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFinances = finances.filter(f => f.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || f.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalRevenue = finances.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return (
        <div className="min-h-screen bg-[#050505] text-white/90 pb-20 overflow-x-hidden">
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

            <div className="p-6 md:p-12 max-w-[1500px] mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 backdrop-blur-xl">
                                <Shield size={24} />
                            </div>
                            <div className="h-px w-12 bg-primary/20" />
                            <span className="text-[0.65rem] font-normal uppercase tracking-[4px] text-primary/60">Super Admin Authority</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-display font-normal tracking-tight text-white mb-3">
                            Executive <span className="text-primary italic">Panel</span>
                        </h1>
                        <p className="text-muted-foreground/60 font-body text-sm max-w-md leading-relaxed">
                            Full control over users, projects, and platform synchronization.
                        </p>
                    </motion.div>

                    <nav className="flex flex-wrap items-center gap-2 bg-white/[0.03] border border-white/5 p-1.5 rounded-2xl backdrop-blur-3xl">
                        {(['talents', 'projects', 'feed', 'applications', 'schedules', 'finances'] as AdminTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSearchTerm(""); }}
                                className={`px-5 py-2.5 rounded-xl text-[0.6rem] font-normal uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <StatsCard icon={<Users size={20} />} label="Platform Talents" value={profiles.length.toString()} trend="+8%" color="primary" />
                    <StatsCard icon={<Calendar size={20} />} label="Auditions Booked" value={schedules.length.toString()} trend="+24%" color="blue" />
                    <StatsCard icon={<DollarSign size={20} />} label="Total Revenue" value={`$${totalRevenue}`} trend="+15%" color="green" />
                    <StatsCard icon={<Star size={20} />} label="Premium (PRO)" value={profiles.filter(p => p.plan === 'pro').length.toString()} trend="+5%" color="amber" />
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card/20 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-10 border-b border-white/5 bg-white/[0.01] flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                {activeTab === 'talents' && <Users className="text-primary" size={24} />}
                                {activeTab === 'projects' && <Briefcase className="text-amber-500" size={24} />}
                                {activeTab === 'feed' && <Layout className="text-blue-500" size={24} />}
                                {activeTab === 'applications' && <FileText className="text-green-500" size={24} />}
                                {activeTab === 'schedules' && <Calendar className="text-blue-500" size={24} />}
                                {activeTab === 'finances' && <DollarSign className="text-green-500" size={24} />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-normal text-white uppercase tracking-tight">{activeTab} Oversight</h2>
                                <p className="text-[0.6rem] text-muted-foreground/30 uppercase tracking-[2px] mt-1">Live Management System</p>
                            </div>
                        </div>
                        <div className="relative group w-full lg:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder={`Filter entries...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-background/40 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary/50 transition-all font-body"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.01] text-muted-foreground/40 font-normal uppercase tracking-[3px] text-[0.6rem] border-b border-white/5">
                                    <th className="px-10 py-6">Identity / Info</th>
                                    <th className="px-10 py-6">Status / State</th>
                                    <th className="px-10 py-6">Reference</th>
                                    <th className="px-10 py-6">Timestamp / Date</th>
                                    <th className="px-10 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-body">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-10 py-8"></td></tr>)
                                ) : (
                                    <>
                                        {activeTab === 'talents' && filteredProfiles.map(p => (
                                            <tr key={p.id} className="hover:bg-white/[0.02] transition-all group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <img src={p.photo_url || ""} className="w-12 h-12 rounded-xl bg-secondary border border-white/10 object-cover shadow-md" />
                                                        <div><p className="text-white text-lg">{p.name}</p><p className="text-xs text-muted-foreground/40">{p.email}</p></div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <button onClick={() => toggleVerification(p)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.6rem] uppercase tracking-widest border transition-all ${(p as any).is_verified ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-primary'}`}>
                                                        <UserCheck size={14} /> {(p as any).is_verified ? 'Verified' : 'Verify'}
                                                    </button>
                                                </td>
                                                <td className="px-10 py-6 text-xs text-primary uppercase tracking-widest">{p.role || 'Member'}</td>
                                                <td className="px-10 py-6 text-xs text-muted-foreground/20 italic">{new Date(p.created_at).toLocaleDateString()}</td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        <button
                                                            onClick={() => toast.info(`Directing to ${p.name} 's profile editor...`)}
                                                            className="p-3 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition-all border border-transparent hover:border-white/10"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button >
                                                        <button onClick={() => handleDelete('profiles', p.id)} className="p-3 bg-red-500/10 text-red-500/20 hover:text-red-500 hover:bg-red-500/20 rounded-xl transition-all"><Ban size={16} /></button>
                                                    </div >
                                                </td>
                                            </tr>
                                        ))}

                                        {
                                            activeTab === 'projects' && filteredProjects.map(pr => (
                                                <tr key={pr.id} className="hover:bg-white/[0.02] transition-all group">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner"><Briefcase className="text-amber-500" size={20} /></div>
                                                            <div><p className="text-white font-normal truncate max-w-[200px] text-lg">{pr.title}</p><p className="text-xs text-muted-foreground/40 font-body">ID: {pr.id.slice(0, 8)}</p></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6"><span className="px-4 py-1.5 bg-white/5 rounded-full text-[0.6rem] uppercase tracking-widest border border-white/10 text-muted-foreground">{pr.status}</span></td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/50 italic truncate max-w-[250px] font-body">"{pr.description}"</td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/30 font-body">{new Date(pr.created_at).toLocaleDateString()}</td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => handleDelete('projects', pr.id)} className="p-3 bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-xl transition-all border border-red-500/5 hover:border-red-500/20"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        }

                                        {
                                            activeTab === 'feed' && filteredFeed.map(f => (
                                                <tr key={f.photo_url} className="hover:bg-white/[0.02] transition-all group">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-lg overflow-hidden relative">
                                                                <img src={f.photo_url} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                                            </div>
                                                            <div><p className="text-white font-normal truncate max-w-[200px] text-lg">{f.description}</p><p className="text-[0.6rem] text-primary uppercase tracking-widest mt-1">Community Activity</p></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6"><span className="text-blue-400 flex items-center gap-2 text-[0.6rem] uppercase tracking-[2px] font-medium"><MessageCircle size={14} /> Shared Media</span></td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/40 font-body">User: {f.user_id.slice(0, 12)}...</td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/30 font-body">{new Date(f.created_at).toLocaleDateString()}</td>
                                                    <td className="px-10 py-6 text-right text-right">
                                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => handleDelete('photo_captions', f.photo_url, "photo_url")} className="p-3 bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-xl transition-all border border-red-500/5 hover:border-red-500/20"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        }

                                        {
                                            activeTab === 'applications' && filteredApps.map(a => (
                                                <tr key={a.id} className="hover:bg-white/[0.02] transition-all group">
                                                    <td className="px-10 py-6">
                                                        <div><p className="text-white font-normal text-lg">{a.profiles?.name || 'Anonymous'}</p><p className="text-xs text-muted-foreground/40 font-body">{a.profiles?.email}</p></div>
                                                    </td>
                                                    <td className="px-10 py-6"><span className="px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-[0.6rem] uppercase tracking-widest border border-green-500/20 shadow-sm">{a.status}</span></td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/60 font-body">Targeting: <span className="text-white font-medium">{a.projects?.title}</span></td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/30 font-body">{new Date(a.created_at).toLocaleDateString()}</td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => handleDelete('applications', a.id)} className="p-3 bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-xl transition-all border border-red-500/5 hover:border-red-500/20"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        }

                                        {activeTab === 'schedules' && filteredSchedules.map(s => (
                                            <tr key={s.id} className="hover:bg-white/[0.02] transition-all group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20"><Clock className="text-blue-500" size={18} /></div>
                                                        <div><p className="text-white text-lg">{s.profiles?.name}</p><p className="text-xs text-muted-foreground/40">Talent Session</p></div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6"><span className="px-4 py-1.5 bg-white/5 rounded-full text-[0.6rem] uppercase tracking-widest border border-white/10">{s.status}</span></td>
                                                <td className="px-10 py-6">
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-xs text-white truncate max-w-[150px]">{s.projects?.title}</p>
                                                        {s.meeting_link && <a href={s.meeting_link} target="_blank" className="flex items-center gap-1 text-[0.55rem] text-primary hover:underline italic"><LinkIcon size={10} /> Join Call</a>}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-xs text-muted-foreground/50">
                                                    {new Date(s.start_time).toLocaleDateString()}
                                                    <p className="text-[0.6rem] text-muted-foreground/30 mt-1">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <button onClick={() => handleDelete('audition_slots', s.id)} className="p-3 bg-red-500/10 text-red-500/20 hover:text-red-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}

                                        {activeTab === 'finances' && filteredFinances.map(f => (
                                            <tr key={f.id} className="hover:bg-white/[0.02] transition-all group">
                                                <td className="px-10 py-6">
                                                    <div><p className="text-white text-lg font-normal">{f.profiles?.name}</p><p className="text-xs text-muted-foreground/40 font-body">{f.profiles?.email}</p></div>
                                                </td>
                                                <td className="px-10 py-6"><span className="px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-[0.6rem] uppercase tracking-widest border border-green-500/20">+ ${f.amount} {f.currency}</span></td>
                                                <td className="px-10 py-6"><span className="text-[0.65rem] text-amber-500 uppercase tracking-[2px] font-medium">{f.plan_type} Subscription</span></td>
                                                <td className="px-10 py-6 text-xs text-muted-foreground/30">{new Date(f.created_at).toLocaleDateString()}</td>
                                                <td className="px-10 py-6 text-right">
                                                    <button onClick={() => handleDelete('transactions', f.id)} className="p-3 bg-white/5 text-muted-foreground/30 hover:text-white rounded-xl transition-all"><ExternalLink size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Fallback for other existing tabs */}
                                        {(activeTab === 'projects' || activeTab === 'feed' || activeTab === 'applications') && (
                                            filteredProjects.length === 0 && filteredFeed.length === 0 && filteredApps.length === 0 && (
                                                <tr><td colSpan={5} className="px-10 py-24 text-center text-muted-foreground/20 italic">No records found for this tab.</td></tr>
                                            )
                                        )}
                                    </>
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
        primary: "bg-primary/10 text-primary border-primary/20",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        green: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return (
        <motion.div whileHover={{ y: -5 }} className="bg-card/30 backdrop-blur-3xl border border-white/5 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-10 ${color === 'primary' ? 'bg-primary' : color === 'amber' ? 'bg-amber-500' : color === 'blue' ? 'bg-blue-500' : 'bg-green-500'}`} />
            <div className="flex items-center justify-between mb-8">
                <div className={`p-4 rounded-2xl border ${colorClasses[color]} shadow-lg transition-transform group-hover:scale-110`}>{icon}</div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <ArrowUpRight size={12} className="text-green-400" />
                    <span className="text-[0.6rem] text-green-400 tracking-widest">{trend}</span>
                </div>
            </div>
            <p className="text-muted-foreground/40 text-[0.6rem] uppercase tracking-[3px] mb-2 font-display">{label}</p>
            <p className="text-4xl font-display text-white">{value}</p>
        </motion.div>
    );
}
