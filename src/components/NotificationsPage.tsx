import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck } from "lucide-react";

interface NotificationsPageProps {
  onOpenPhoto?: (url: string) => void;
}

export default function NotificationsPage({ onOpenPhoto }: NotificationsPageProps) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select(`
        *,
        actor:profiles!actor_id (name, photo_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    if (!user) return;
    const channel = supabase.channel('notif-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) {
      toast.error("Failed to update notification");
    } else {
      fetch();
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    if (error) {
      console.error("Mark all read error:", error);
      toast.error("Failed to mark all as read. Check permissions.");
    } else {
      toast.success("All marked as read");
      fetch();
    }
  };

  const handleNotifClick = (n: any) => {
    if (!n.is_read) markRead(n.id);
    if (n.photo_url && onOpenPhoto) {
      onOpenPhoto(n.photo_url);
    }
  };

  return (
    <motion.div className="max-w-[700px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-primary">Notifications</h1>
        {notifs.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-body transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading…</p>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotifClick(n)}
              className={`bg-card border-[1.5px] rounded-2xl px-5 py-4 flex items-start gap-4 transition-all cursor-pointer group ${n.is_read ? "border-card-border opacity-70" : "border-primary/20 hover:border-primary/50 gold-glow bg-primary/5"
                }`}
            >
              {/* Profile Photo or Unread Dot */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-secondary border border-border overflow-hidden">
                  {n.actor?.photo_url ? (
                    <img src={n.actor.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-display text-lg text-primary">
                      {n.actor?.name?.[0] || '?'}
                    </div>
                  )}
                </div>
                {!n.is_read && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary border-2 border-card rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-normal text-sm text-foreground group-hover:text-primary transition-colors">{n.title}</div>
                {n.message && <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</div>}
                <div className="text-[0.65rem] text-muted-foreground/50 mt-2 font-medium uppercase tracking-wider">{new Date(n.created_at).toLocaleString()}</div>
              </div>

              {n.photo_url && (
                <div className="w-12 h-12 bg-secondary/50 rounded-lg flex-shrink-0 border border-border overflow-hidden relative group-hover:border-primary/50 transition-colors">
                  <img src={n.photo_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                </div>
              )}

              {!n.is_read && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
