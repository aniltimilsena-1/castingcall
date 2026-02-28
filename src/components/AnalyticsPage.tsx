import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Eye, FolderOpen, Activity, Crown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewStats, setViewStats] = useState({
    totalViews: 0,
    projectCount: 0,
    activityScore: 0,
    chartData: [
      { name: "Mon", views: 0 },
      { name: "Tue", views: 0 },
      { name: "Wed", views: 0 },
      { name: "Thu", views: 0 },
      { name: "Fri", views: 0 },
      { name: "Sat", views: 0 },
      { name: "Sun", views: 0 },
    ]
  });

  useEffect(() => {
    if (user && profile) {
      fetchAnalytics();
    }
  }, [user, profile]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // 1. Fetch Total Views & Chart Data
      const { data: views } = await supabase
        .from("profile_views" as any)
        .select("viewed_at")
        .eq("profile_id", profile.id);

      const countsByDay: Record<string, number> = {
        "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0
      };

      (views as any[])?.forEach((v: any) => {
        const day = new Date(v.viewed_at).toLocaleDateString('en-US', { weekday: 'short' });
        if (countsByDay[day] !== undefined) countsByDay[day]++;
      });

      const chartData = [
        { name: "Mon", views: countsByDay["Mon"] },
        { name: "Tue", views: countsByDay["Tue"] },
        { name: "Wed", views: countsByDay["Wed"] },
        { name: "Thu", views: countsByDay["Thu"] },
        { name: "Fri", views: countsByDay["Fri"] },
        { name: "Sat", views: countsByDay["Sat"] },
        { name: "Sun", views: countsByDay["Sun"] },
      ];

      // 2. Fetch Project Count
      const { count: projectCount } = await supabase
        .from("projects")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // 3. Activity Score (Arbitrary calculation)
      const score = Math.min(100, Math.floor(((views?.length || 0) * 5) + ((projectCount || 0) * 10)));

      setViewStats({
        totalViews: views?.length || 0,
        projectCount: projectCount || 0,
        activityScore: score,
        chartData
      });
    } catch (err) {
      console.error("Analytics Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: "Profile Views", value: viewStats.totalViews.toString(), icon: Eye },
    { label: "Active Projects", value: viewStats.projectCount.toString(), icon: FolderOpen },
    { label: "Activity Score", value: `${viewStats.activityScore}%`, icon: Activity },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (profile?.plan !== 'pro') {
    return (
      <motion.div
        className="max-w-[700px] mx-auto px-4 py-24 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
          <Crown className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="font-display text-4xl text-white mb-4 italic">Advanced Analytics</h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto leading-relaxed">
          See who's viewing your profile, track your project reach, and get insights to grow your career.
        </p>
        <button
          onClick={() => window.location.href = "/premium"}
          className="bg-primary text-black px-10 py-4 rounded-xl font-normal text-xs uppercase tracking-[3px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          Upgrade to PRO
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div className="max-w-[900px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-4xl text-primary mb-8">Analytics</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-display text-2xl text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-normal text-sm">Profile Views This Week</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={viewStats.chartData}>
            <XAxis dataKey="name" tick={{ fill: "hsl(0 0% 53%)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(0 0% 53%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8, color: "hsl(0 0% 94%)" }}
            />
            <Bar dataKey="views" fill="hsl(46 91% 53%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
