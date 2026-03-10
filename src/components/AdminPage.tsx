import { useEffect, useState } from "react";
import { adminService } from "@/services/adminService";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Users, Shield, Search, DollarSign, Trash2, Globe, Crown, X, MapPin } from "lucide-react";
import { toast } from "sonner";

type Profile = Tables<"profiles">;
type Project = Tables<"projects">;
type FeedPost = Tables<"photo_captions">;

type AdminTab = "talents" | "projects" | "feed" | "applications" | "schedules" | "finances" | "verifications";

interface AdminFeedItem {
    url: string;
    user_id: string;
    userName: string;
    description: string;
    is_premium: boolean;
    price: number;
    created_at: string;
}

interface AdminApplication extends Tables<"applications"> {
    projects: { title: string } | null;
}

interface AdminSchedule extends Tables<"audition_slots"> {
    projects: { title: string } | null;
}

interface AdminFinance extends Tables<"transactions"> { }

interface AdminVerification extends Tables<"payment_verifications"> { }

export default function AdminPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [allFeedItems, setAllFeedItems] = useState<AdminFeedItem[]>([]);
    const [applications, setApplications] = useState<AdminApplication[]>([]);
    const [schedules, setSchedules] = useState<AdminSchedule[]>([]);
    const [finances, setFinances] = useState<AdminFinance[]>([]);
    const [verifications, setVerifications] = useState<AdminVerification[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>("talents");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAllAdminData();

            if (data.profiles) setProfiles(data.profiles);
            if (data.projects) setProjects(data.projects);

            // Merge photos from all profiles with captions
            const mergedFeed: AdminFeedItem[] = [];
            const captionsMap = new Map((data.feedItems || []).map(f => [f.photo_url, f as FeedPost]));

            (data.profiles || []).forEach(profile => {
                const photos = profile.photos || [];
                photos.forEach((url: string) => {
                    const caption = captionsMap.get(url);
                    mergedFeed.push({
                        url,
                        user_id: profile.user_id,
                        userName: profile.name || "Unknown",
                        description: caption?.description || "",
                        is_premium: caption?.is_premium || false,
                        price: caption?.price || 0,
                        created_at: caption?.created_at || profile.created_at
                    });
                });
            });
            setAllFeedItems(mergedFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            if (data.applications) setApplications(data.applications);
            if (data.schedules) setSchedules(data.schedules);
            if (data.finances) setFinances(data.finances);
            if (data.verifications) setVerifications(data.verifications);

        } catch (err) {
            console.error("Fetch error:", err);
            toast.error("Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprovePayment = async (v: { id: string; user_id: string; amount: number; payment_type: string }) => {
        try {
            await adminService.approvePayment(v);
            toast.success("Payment approved! User updated.");
            fetchAllData();
        } catch (err: unknown) {
            const error = err as Error;
            toast.error("Approval failed: " + error.message);
        }
    };

    const handleRejectPayment = async (id: string) => {
        if (!confirm("Reject this payment?")) return;
        try {
            await adminService.rejectPayment(id);
            toast.info("Payment rejected.");
            fetchAllData();
        } catch (err: unknown) {
            const error = err as Error;
            toast.error("Rejection failed: " + error.message);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure? This will remove the casting call forever.")) return;
        try {
            await adminService.deleteProject(id);
            toast.info("Project removed.");
            fetchAllData();
        } catch (err) {
            toast.error("Failed to delete project");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Delete user profile?')) return;
        try {
            await adminService.deleteProfile(userId);
            toast.success('Profile removed');
            fetchAllData();
        } catch (err) {
            console.error("Delete user error:", err);
            toast.error("Failed to delete user profile.");
        }
    };

    const handleOpenScreenshot = async (url: string) => {
        if (!url) return;
        // Extract path from public URL if it's there
        const path = url.split('/payments/').pop() || url;
        const { data, error } = await supabase.storage.from('payments').createSignedUrl(path, 60);
        if (error) {
            toast.error("Could not generate secure link");
            window.open(url, '_blank'); // fallback
        } else if (data?.signedUrl) {
            window.open(data.signedUrl, '_blank');
        }
    };

    const filteredProfiles = profiles.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Revenue tracking across currencies
    // Group 1: Transactions (Stripe + Approved Manual)
    const usdRevenue = finances.filter(f => f.currency === 'USD' || f.currency === 'stripe_global').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    // Group 2: Manual payments from verifications (Backup source)
    const manualApprovedRevenue = verifications.filter(v => v.status === 'approved').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const nprFromTransactions = finances.filter(f => f.currency === 'NPR').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    // Final total (using higher of two sources for NPR for resilience)
    const nprRevenue = Math.max(manualApprovedRevenue, nprFromTransactions);

    return (
        <div className="min-h-screen bg-[#050505] text-white/90 pb-20">
            <div className="p-6 md:p-12 max-w-[1500px] mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="text-primary" size={24} />
                            <span className="text-[0.65rem] uppercase tracking-[4px] text-primary/60">Global Admin Oversight</span>
                        </div>
                        <h1 className="text-5xl font-display font-normal text-white mb-3">Executive <span className="text-primary italic">Command</span></h1>
                    </div>

                    <nav className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl">
                        {(['talents', 'projects', 'feed', 'applications', 'schedules', 'finances', 'verifications'] as AdminTab[]).map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl text-[0.6rem] uppercase tracking-widest ${activeTab === tab ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}>
                                {tab}
                                {tab === 'verifications' && verifications.filter(v => v.status === 'pending').length > 0 && <span className="ml-2 bg-red-500 rounded-full px-1.5 py-0.5 text-[0.5rem] text-white">!</span>}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <StatsCard icon={<Globe className="text-blue-500" size={20} />} label="Global Market" value="Worldwide" trend="LIVE" color="blue" />
                    <StatsCard icon={<Users size={20} />} label="Total Talents" value={profiles.length.toString()} trend="+12%" color="primary" />
                    <StatsCard icon={<DollarSign size={20} />} label="Total Revenue (USD)" value={`$${usdRevenue}`} trend="STRIPE" color="green" />
                    <StatsCard icon={<DollarSign size={20} />} label="Total Revenue (NPR)" value={`Rs.${nprRevenue}`} trend="NEPAL" color="amber" />
                </div>

                <div className="bg-card/20 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden">
                    <div className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-white/5">
                        <h2 className="text-2xl font-display text-white uppercase">{activeTab} Management</h2>
                        <div className="relative w-full lg:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input type="text" placeholder="Search entries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-background/40 border border-white/10 rounded-2xl text-sm" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                                <tr>
                                    <th className="px-10 py-6">Reference</th>
                                    <th className="px-10 py-6">State / Value</th>
                                    <th className="px-10 py-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeTab === 'talents' && filteredProfiles.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-10 py-6 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                                                {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary">{p.name?.[0]}</div>}
                                            </div>
                                            <div><p className="text-white">{p.name}</p><p className="text-[0.6rem] text-muted-foreground uppercase">{p.role}</p></div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className={`px-2 py-1 rounded text-[0.5rem] uppercase tracking-widest ${p.plan === 'pro' ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'}`}>{p.plan || 'free'}</span>
                                        </td>
                                        <td className="px-10 py-6 border-none">
                                            <div className="flex items-center gap-2">
                                                <button onClick={async () => {
                                                    const newPlan = p.plan === 'pro' ? 'free' : 'pro';
                                                    await supabase.from('profiles').update({ plan: newPlan } as never).eq('id', p.id);
                                                    toast.success(`User set to ${newPlan.toUpperCase()}`);
                                                    fetchAllData();
                                                }} className={`p-2 rounded-lg transition-colors ${p.plan === 'pro' ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-white/5'}`} title="Toggle PRO">
                                                    <Crown size={16} />
                                                </button>
                                                <button onClick={async () => {
                                                    if (confirm('Delete user profile?')) {
                                                        await supabase.from('profiles').delete().eq('id', p.id);
                                                        toast.success('Profile removed');
                                                        fetchAllData();
                                                    }
                                                }} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg" title="Delete Permanent">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'feed' && allFeedItems.map(f => {
                                    return (
                                        <tr key={f.url}>
                                            <td className="px-10 py-6 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex items-center justify-center">
                                                    {f.url?.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || f.url?.includes('videos%2F') ? (
                                                        <video src={`${f.url}#t=0.1`} className="w-full h-full object-cover" muted playsInline />
                                                    ) : (
                                                        <img src={f.url} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div><p className="text-white truncate max-w-[200px]">{f.description || 'No description'}</p><p className="text-xs text-muted-foreground">by {f.userName || 'Unknown'}</p></div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                                                    {f.is_premium && <span className="text-[0.5rem] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/30 w-fit">PREMIUM (${f.price})</span>}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <button onClick={async () => { if (confirm('Delete post?')) { await supabase.from('photo_captions').delete().eq('photo_url', f.url); toast.success('Deleted'); fetchAllData(); } }} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {activeTab === 'schedules' && schedules.map(s => (
                                    <tr key={s.id}>
                                        <td className="px-10 py-6"><p className="text-white">{s.projects?.title}</p></td>
                                        <td className="px-10 py-6"><p className="text-xs text-muted-foreground">{new Date(s.start_time).toLocaleString()}</p></td>
                                        <td className="px-10 py-6"><span className={`px-2 py-1 rounded text-[0.5rem] uppercase ${s.status === 'booked' ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-muted-foreground'}`}>{s.status}</span></td>
                                    </tr>
                                ))}
                                {activeTab === 'projects' && projects.map(p => {
                                    const prof = profiles.find(pr => pr.user_id === p.user_id);
                                    return (
                                        <tr key={p.id}>
                                            <td className="px-10 py-6"><div><p className="text-white font-medium">{p.title}</p><p className="text-xs text-muted-foreground">by {prof?.name || 'Unknown'}</p></div></td>
                                            <td className="px-10 py-6"><span className={`px-3 py-1 rounded-full text-[0.6rem] uppercase ${p.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-secondary text-muted-foreground'}`}>{p.status}</span></td>
                                            <td className="px-10 py-6"><button onClick={() => handleDeleteProject(p.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button></td>
                                        </tr>
                                    );
                                })}
                                {activeTab === 'applications' && applications.map(a => {
                                    const prof = profiles.find(p => p.user_id === a.applicant_id);
                                    return (
                                        <tr key={a.id}>
                                            <td className="px-10 py-6"><div><p className="text-white">{prof?.name || 'Unknown'}</p><p className="text-xs text-muted-foreground">Applied for: {a.projects?.title}</p></div></td>
                                            <td className="px-10 py-6"><span className={`px-3 py-1 rounded-full text-[0.6rem] uppercase ${a.status === 'accepted' ? 'bg-green-500/10 text-green-500' : 'bg-secondary text-muted-foreground'}`}>{a.status}</span></td>
                                            <td className="px-10 py-6 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    );
                                })}
                                {activeTab === 'finances' && finances.map(f => {
                                    const prof = profiles.find(p => p.user_id === f.user_id);
                                    return (
                                        <tr key={f.id}>
                                            <td className="px-10 py-6"><div><p className="text-white">{prof?.name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{prof?.email || 'N/A'}</p></div></td>
                                            <td className="px-10 py-6"><span className="text-primary font-bold">{f.currency} {f.amount}</span></td>
                                            <td className="px-10 py-6 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    );
                                })}
                                {activeTab === 'verifications' && verifications.map(v => {
                                    const prof = profiles.find(p => p.user_id === v.user_id);
                                    return (
                                        <tr key={v.id}>
                                            <td className="px-10 py-6">
                                                <p className="text-white">{prof?.name || 'Unknown'}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[0.5rem] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-muted-foreground uppercase">{v.payment_type || 'pro'}</span>
                                                    <button onClick={() => handleOpenScreenshot(v.screenshot_url)} className="text-[0.5rem] text-primary underline">Verify Receipt</button>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <p className="text-white text-xs font-bold">NPR {v.amount}</p>
                                                <span className={`px-3 py-1 rounded-full text-[0.5rem] uppercase ${v.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : v.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{v.status}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                {v.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleApprovePayment(v)} className="bg-primary text-black px-4 py-2 rounded-xl text-[0.6rem] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">Approve</button>
                                                        <button onClick={() => handleRejectPayment(v.id)} className="bg-white/5 text-red-500 px-3 py-2 rounded-xl text-[0.6rem] hover:bg-red-500/10"><X size={14} /></button>
                                                    </div>
                                                )}
                                                {v.status !== 'pending' && <span className="text-xs text-muted-foreground italic">{v.status === 'approved' ? 'Verified' : 'Declined'}</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ icon, label, value, trend, color: _color }: { icon: React.ReactNode; label: string; value: string; trend: string; color: string }) {
    return (
        <div className="bg-card/30 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">{icon} <span className="text-[0.6rem] text-green-400 tracking-widest">{trend}</span></div>
            <p className="text-muted-foreground/40 text-[0.6rem] uppercase tracking-widest mb-2">{label}</p>
            <p className="text-4xl font-display text-white">{value}</p>
        </div>
    );
}
