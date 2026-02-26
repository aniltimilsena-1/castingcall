import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bookmark, BookmarkX, Trash2 } from "lucide-react";

import ProfileDetailDialog from "./ProfileDetailDialog";

type Profile = Tables<"profiles">;

export default function SavedTalentsPage() {
  const { user, profile: currentUserProfile } = useAuth();
  const [talents, setTalents] = useState<(Profile & { saved_id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSaved = async () => {
    if (!user) return;
    const { data: savedRows } = await supabase
      .from("saved_talents")
      .select("id, talent_profile_id")
      .eq("user_id", user.id);

    if (!savedRows || savedRows.length === 0) {
      setTalents([]);
      setLoading(false);
      return;
    }

    const profileIds = savedRows.map((s) => s.talent_profile_id);
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", profileIds);

    const merged = (profiles || []).map((p) => ({
      ...p,
      saved_id: savedRows.find((s) => s.talent_profile_id === p.id)?.id || "",
    }));
    setTalents(merged);
    setLoading(false);
  };

  useEffect(() => { fetchSaved(); }, [user]);

  const unsave = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    const talent = talents.find(t => t.id === profileId);
    if (!talent) return;

    const { error } = await supabase.from("saved_talents").delete().eq("id", talent.saved_id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from saved list");
    fetchSaved();
  };

  const handleOpenProfile = (p: Profile) => {
    setSelectedProfile(p);
    setDialogOpen(true);
  };

  return (
    <motion.div className="max-w-[1000px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl text-primary">Saved Talents</h1>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{talents.length} Profiles Saved</div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Fetching your favorite talents...</p>
        </div>
      ) : talents.length === 0 ? (
        <div className="text-center py-24 bg-card/30 border border-dashed border-border rounded-3xl">
          <Bookmark className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
          <h2 className="text-xl font-medium text-foreground mb-2">No saved profiles yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto font-body text-sm leading-relaxed">
            When you find a talent you'd like to work with, click the save icon to store them here for quick access.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
          {talents.map((t) => (
            <div
              key={t.id}
              onClick={() => handleOpenProfile(t)}
              className="group bg-card border-[1.5px] border-card-border rounded-2xl p-5 flex items-center gap-5 hover:border-primary/50 hover:shadow-xl transition-all h-32 cursor-pointer"
            >
              <div className="w-20 h-20 rounded-2xl bg-secondary border border-border overflow-hidden flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                {t.photo_url ? (
                  <img src={t.photo_url} className="w-full h-full object-cover" alt={t.name || ""} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display text-2xl text-primary">
                    {(t.name || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-base text-foreground truncate group-hover:text-primary transition-colors">{t.name}</div>
                  {t.plan === 'pro' && <span className="text-[0.6rem] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 flex-shrink-0">PRO</span>}
                </div>
                <div className="text-sm text-primary font-medium mb-1 line-clamp-1">{t.role}</div>
                {t.location && <div className="text-[0.7rem] text-muted-foreground/60 flex items-center gap-1 font-medium italic">📍 {t.location}</div>}
              </div>

              <button
                onClick={(e) => unsave(e, t.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-destructive/5 text-destructive/40 hover:bg-destructive hover:text-white transition-all shadow-sm border border-transparent hover:border-destructive/50"
                title="Remove from saved"
              >
                <BookmarkX size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ProfileDetailDialog
        profile={selectedProfile}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        currentUserProfile={currentUserProfile}
        isSaved={true} // In this page, they are all saved by definition
        onToggleSave={unsave}
      />
    </motion.div>
  );
}
