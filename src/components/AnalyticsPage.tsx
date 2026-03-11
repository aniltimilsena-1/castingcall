import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Eye, FolderOpen, Activity, Crown, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Lightbulb, MessageSquare, Target, Zap } from "lucide-react";

export default function AnalyticsPage() {
  const { user, profile, isPremium } = useAuth();
  const [loading, setLoading] = useState(true);
  const [viewStats, setViewStats] = useState({
    totalViews: 0,
    projectCount: 0,
    activityScore: 0,
    successRate: 0,
    portfolioInteractions: 0,
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

  const [aiInsights, setAiInsights] = useState<any[]>([]);

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

      // 3. Fetch Application Success Rate
      const { data: apps } = await supabase
        .from("applications" as any)
        .select("status")
        .eq("applicant_id", user.id);

      const totalApps = apps?.length || 0;
      const acceptedApps = (apps as any[])?.filter(a => a.status === 'accepted')?.length || 0;
      const successRate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 0;

      // 4. Fetch Portfolio Interactions
      const { count: interactionsCount } = await supabase
        .from("portfolio_interactions" as any)
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id);

      // 5. Activity Score (Improved calculation)
      const score = Math.min(100, Math.floor(
        ((views?.length || 0) * 2) +
        ((interactionsCount || 0) * 3) +
        ((acceptedApps || 0) * 15)
      ));

      // 6. Simmons AI Feedback (Empty for now until real AI is linked)
      setAiInsights([]);

      setViewStats({
        totalViews: views?.length || 0,
        projectCount: totalApps, // Total applications in this context
        activityScore: score,
        successRate,
        portfolioInteractions: interactionsCount || 0,
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

  if (!isPremium) {
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

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-normal text-sm">Engagement Overview</h3>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[0.6rem] font-normal tracking-widest">WEEKLY</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={viewStats.chartData}>
              <XAxis dataKey="name" tick={{ fill: "hsl(0 0% 53%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(0 0% 53%)", fontSize: 10 }} axisLine={false} tickLine={false} hide />
              <Tooltip
                cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                contentStyle={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 12, color: "hsl(0 0% 94%)", fontSize: 12 }}
              />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy size={100} className="text-primary" />
          </div>
          <div className="relative mb-6">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary" />
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * viewStats.successRate) / 100} className="text-primary transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display text-white">{viewStats.successRate}%</span>
            </div>
          </div>
          <h3 className="text-sm font-normal mb-1">Casting Success Rate</h3>
          <p className="text-[0.65rem] text-muted-foreground max-w-[180px]">Based on your last {viewStats.projectCount} applications.</p>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="text-primary" size={20} />
          <h2 className="font-display text-xl text-white italic">AI Talent Growth Feedback</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-xl bg-background border border-border group-hover:border-primary/20 transition-colors`}>
                  <insight.icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <Badge className="bg-primary/5 text-primary border-primary/20 text-[0.55rem] font-normal">{insight.impact}</Badge>
              </div>
              <h4 className="text-sm font-normal text-white mb-2">{insight.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <StatsCard label="Portfolio Clicks" value={viewStats.portfolioInteractions.toString()} icon={Zap} desc="Direct interactions" />
      </div>
    </motion.div>
  );
}

function StatsCard({ label, value, icon: Icon, desc }: { label: string; value: string; icon: any; desc: string }) {
  return (
    <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4 text-muted-foreground/60">
        <Icon size={16} />
        <span className="text-[0.65rem] font-normal uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-display text-white mb-1">{value}</div>
      <div className="text-[0.6rem] text-muted-foreground italic font-normal tracking-wide">{desc}</div>
    </div>
  );
}
