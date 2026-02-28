import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Users, Shield, Activity, Search } from "lucide-react";
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

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-2"
                >
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-3xl font-display font-normal tracking-tight">Admin Dashboard</h1>
                </motion.div>
                <p className="text-muted-foreground">Manage users, roles, and platform activity.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatsCard icon={<Users className="text-blue-500" />} label="Total Users" value={profiles.length.toString()} />
                <StatsCard icon={<Shield className="text-purple-500" />} label="Admins" value={profiles.filter(p => p.role === 'Admin').length.toString()} />
                <StatsCard icon={<Activity className="text-green-500" />} label="Active Today" value="--" />
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="font-normal flex items-center gap-2">
                        <Users size={18} />
                        User Management
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-64 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-muted/20 text-muted-foreground font-medium uppercase tracking-wider text-[0.7rem] border-b border-border">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16 bg-muted/5"></td>
                                    </tr>
                                ))
                            ) : filteredProfiles.length > 0 ? (
                                filteredProfiles.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                                                    {p.photo_url ? (
                                                        <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-normal text-xs uppercase">{p.name?.[0] || '?'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-normal text-foreground leading-tight">{p.name || 'Anonymous'}</p>
                                                    <p className="text-muted-foreground text-[0.75rem]">{p.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[0.7rem] font-normal uppercase tracking-wider ${p.role === 'Admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                                                }`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {p.location || 'Not set'}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-muted-foreground hover:text-primary transition-colors font-medium">
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4"
        >
            <div className="p-4 bg-background rounded-xl border border-border shadow-inner">
                {icon}
            </div>
            <div>
                <p className="text-muted-foreground text-sm font-medium">{label}</p>
                <p className="text-2xl font-display font-normal">{value}</p>
            </div>
        </motion.div>
    );
}
