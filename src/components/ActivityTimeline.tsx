import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, UserPlus, Image, Star, TrendingUp, 
  CheckCircle2, Send, Eye, Award, Clock 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEntry {
  id: string;
  type: "applied" | "cast" | "updated" | "trending" | "joined" | "verified" | "viewed" | "saved";
  title: string;
  description?: string;
  timestamp: string;
}

const ICONS: Record<TimelineEntry["type"], { icon: typeof Star; color: string }> = {
  applied:  { icon: Send,          color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  cast:     { icon: Award,         color: "text-primary bg-primary/10 border-primary/20" },
  updated:  { icon: Image,         color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  trending: { icon: TrendingUp,    color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  joined:   { icon: UserPlus,      color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  verified: { icon: CheckCircle2,  color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  viewed:   { icon: Eye,           color: "text-muted-foreground bg-foreground/5 border-border" },
  saved:    { icon: Star,          color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ActivityTimelineProps {
  userId: string;
  maxItems?: number;
}

export default function ActivityTimeline({ userId, maxItems = 8 }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchActivity = async () => {
      setLoading(true);
      const timeline: TimelineEntry[] = [];

      try {
        // 1. Profile creation date
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_at, is_verified, updated_at, trending_score")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile) {
          timeline.push({
            id: "joined",
            type: "joined",
            title: "Joined CaastingCall",
            timestamp: profile.created_at,
          });

          if (profile.is_verified) {
            timeline.push({
              id: "verified",
              type: "verified",
              title: "Account Verified",
              description: "Identity confirmed by admin team",
              timestamp: profile.updated_at || profile.created_at,
            });
          }

          if ((profile.trending_score || 0) > 50) {
            timeline.push({
              id: "trending",
              type: "trending",
              title: "Achieved Trending Status",
              description: `Trending score: ${profile.trending_score}`,
              timestamp: profile.updated_at || profile.created_at,
            });
          }
        }

        // 2. Applications
        const { data: applications } = await supabase
          .from("project_applications")
          .select("id, created_at, status, project_id")
          .eq("applicant_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (applications) {
          for (const app of applications) {
            const { data: project } = await supabase
              .from("projects")
              .select("title")
              .eq("id", app.project_id)
              .maybeSingle();

            if (app.status === "accepted") {
              timeline.push({
                id: `cast-${app.id}`,
                type: "cast",
                title: `Cast in "${project?.title || "Untitled Project"}"`,
                description: "Application accepted",
                timestamp: app.created_at,
              });
            } else {
              timeline.push({
                id: `applied-${app.id}`,
                type: "applied",
                title: `Applied to "${project?.title || "Untitled Project"}"`,
                timestamp: app.created_at,
              });
            }
          }
        }

        // 3. Profile views as "viewed" events (aggregated)
        const { count: viewCount } = await supabase
          .from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", userId);

        if (viewCount && viewCount > 0) {
          timeline.push({
            id: "views",
            type: "viewed",
            title: `Profile viewed ${viewCount} times`,
            description: "By casting directors and talent scouts",
            timestamp: new Date().toISOString(),
          });
        }

        // 4. Saved by others
        const { count: savedCount } = await supabase
          .from("saved_talents")
          .select("*", { count: "exact", head: true })
          .eq("talent_profile_id", userId);

        if (savedCount && savedCount > 0) {
          timeline.push({
            id: "saved",
            type: "saved",
            title: `Saved by ${savedCount} users`,
            description: "Added to casting directors' lists",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Activity timeline error:", err);
      }

      // Sort by date descending
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(timeline.slice(0, maxItems));
      setLoading(false);
    };

    fetchActivity();
  }, [userId, maxItems]);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-secondary rounded w-2/3" />
              <div className="h-2 bg-secondary/50 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock size={24} className="text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="relative group/timeline">
      {/* Vertical timeline line centered on the 32px (w-8) icons */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-border/50 via-border/20 to-transparent z-0" />

      <div className="space-y-5">
        {entries.map((entry, i) => {
          const { icon: Icon, color } = ICONS[entry.type];
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex items-start gap-5 group"
            >
              {/* Timeline icon dot */}
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 z-10 transition-transform group-hover:scale-110 ${color}`}>
                <Icon size={14} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-foreground leading-snug">{entry.title}</p>
                {entry.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{entry.description}</p>
                )}
                <span className="font-mono-tech text-[9px] mt-1 block text-muted-foreground/60">
                  {formatRelativeTime(entry.timestamp)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
