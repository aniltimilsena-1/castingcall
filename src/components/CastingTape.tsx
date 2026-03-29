import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { Heart, X, Send, ChevronUp, MapPin, Star, Crown, CheckCircle2, Film } from "lucide-react";
import { profileService, type Profile } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateSmartMatch, getMatchBadgeStyle } from "@/utils/smartMatch";
import { toast } from "sonner";

interface CastingTapeProps {
  open: boolean;
  onClose: () => void;
  onProfileClick: (profile: Profile) => void;
  role?: string;
}

export default function CastingTape({ open, onClose, onProfileClick, role }: CastingTapeProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | "up" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = role
          ? await profileService.searchProfiles({ role })
          : await profileService.getFeaturedProfiles();
        setProfiles(data.slice(0, 50));
        setCurrentIndex(0);
      } catch {
        toast.error("Failed to load profiles");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [open, role]);

  const handleSwipe = useCallback(async (dir: "left" | "right" | "up") => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    setDirection(dir);
    
    if (dir === "right" && user) {
      // Save talent
      try {
        // Haptic feedback
        try { (window as any).Capacitor?.Plugins?.Haptics?.impact?.({ style: "medium" }); } catch {}
        
        await supabase.from("saved_talents").upsert(
          { user_id: user.id, talent_profile_id: profile.id || profile.user_id },
          { onConflict: "user_id,talent_profile_id" }
        );
        toast.success("Saved to your list!", { icon: "⭐" });
      } catch { /* ignore dupes */ }
    }
    
    if (dir === "left") {
        try { (window as any).Capacitor?.Plugins?.Haptics?.impact?.({ style: "light" }); } catch {}
    }
    
    if (dir === "up") {
        try { (window as any).Capacitor?.Plugins?.Haptics?.notification?.({ type: "success" }); } catch {}
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setDirection(null);
    }, 300);
  }, [currentIndex, profiles, user]);

  if (!open) return null;

  const profile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];
  const isFinished = currentIndex >= profiles.length && !loading;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 py-10"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-1">
            <div className="font-mono-tech text-primary/60 tracking-[0.3em] text-[10px]">CASTING TAPE</div>
            {!isFinished && profile && (
              <div className="text-[10px] text-muted-foreground/40 font-mono-tech">
                {currentIndex + 1} / {profiles.length}
              </div>
            )}
          </div>

          {/* Close - Moved to top right relative to viewport */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-[510] w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center active:scale-90"
          >
            <X size={20} />
          </button>

          {/* Card stack container */}
          <div className="relative w-[340px] h-auto aspect-[3/4.5] md:w-[420px] md:h-[600px] flex items-center justify-center">
            {/* Background card (next) */}
            {nextProfile && (
              <div className="absolute inset-0 scale-[0.92] opacity-30 rounded-[2rem] overflow-hidden bg-card border border-border">
                <div className="w-full h-2/3 bg-secondary">
                  {nextProfile.photo_url && (
                    <img src={nextProfile.photo_url} className="w-full h-full object-cover" alt="" />
                  )}
                </div>
              </div>
            )}

            {/* Active card */}
            <AnimatePresence mode="popLayout">
              {profile && !isFinished && (
                <SwipeCard
                  key={profile.id || profile.user_id}
                  profile={profile}
                  onSwipe={handleSwipe}
                  direction={direction}
                  onTap={() => onProfileClick(profile)}
                  role={role}
                />
              )}
            </AnimatePresence>

            {/* Finished state */}
            {isFinished && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6 bg-card/30 border border-border rounded-[2rem] backdrop-blur-md"
              >
                <Film size={48} className="text-primary/30" />
                <div>
                  <h3 className="font-display text-2xl text-foreground mb-2">That's a Wrap</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    You've reviewed all available talent. Check back later for new profiles.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Back to Search
                </button>
              </motion.div>
            )}
          </div>

          {/* Action buttons - Now relative and below the card */}
          {!isFinished && profile && (
            <div className="flex items-center gap-6 z-[510]">
              <button
                onClick={() => handleSwipe("left")}
                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center active:scale-90"
                title="Skip"
              >
                <X size={24} />
              </button>
              <button
                onClick={() => handleSwipe("up")}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all flex items-center justify-center active:scale-90"
                title="View Full Profile"
              >
                <ChevronUp size={20} />
              </button>
              <button
                onClick={() => handleSwipe("right")}
                className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all flex items-center justify-center active:scale-90 shadow-lg shadow-primary/10"
                title="Save Talent"
              >
                <Heart size={24} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Individual swipeable card */
function SwipeCard({
  profile,
  onSwipe,
  direction,
  onTap,
  role,
}: {
  profile: Profile;
  onSwipe: (dir: "left" | "right" | "up") => void;
  direction: "left" | "right" | "up" | null;
  onTap: () => void;
  role?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const saveOpacity = useTransform(x, [0, 100], [0, 1]);
  const skipOpacity = useTransform(x, [-100, 0], [1, 0]);

  const isElite = profile.plan === "pro" || profile.role === "Admin";

  const handleDragEnd = (_: any, info: PanInfo) => {
    const xOff = info.offset.x;
    const yOff = info.offset.y;
    if (xOff > 100) onSwipe("right");
    else if (xOff < -100) onSwipe("left");
    else if (yOff < -100) onSwipe("up");
  };

  const exitX = direction === "right" ? 400 : direction === "left" ? -400 : 0;
  const exitY = direction === "up" ? -500 : 0;

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: exitX, y: exitY, opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
      onClick={onTap}
      className={`absolute inset-0 cursor-grab active:cursor-grabbing rounded-[2rem] overflow-hidden bg-card border select-none touch-none ${
        isElite ? "border-amber-500/30" : "border-border"
      }`}
    >
      {/* Gradient border wrapper for pro */}
      {isElite && (
        <div className="absolute inset-0 rounded-[2rem] pointer-events-none z-30">
          <div className="absolute inset-0 border-2 border-amber-500/20 rounded-[2rem] animate-pulse" />
        </div>
      )}

      {/* Photo */}
      <div className="relative w-full h-[60%] bg-secondary overflow-hidden reel-preview-container">
        {profile.photo_url ? (
          <img src={profile.photo_url} className="w-full h-full object-cover ken-burns" alt={profile.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-6xl text-primary/20">
            {profile.name?.[0]}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

        {/* Swipe indicators */}
        <motion.div style={{ opacity: saveOpacity }} className="absolute top-6 right-6 px-4 py-2 rounded-xl border-2 border-primary text-primary font-bold text-sm uppercase tracking-wider -rotate-12">
          SAVE ⭐
        </motion.div>
        <motion.div style={{ opacity: skipOpacity }} className="absolute top-6 left-6 px-4 py-2 rounded-xl border-2 border-red-500 text-red-500 font-bold text-sm uppercase tracking-wider rotate-12">
          SKIP ✕
        </motion.div>

        {/* Smart Match Score Badge */}
        <div className="absolute bottom-6 right-6">
          {(() => {
            const match = calculateSmartMatch(
              { 
                role: profile.role, 
                location: profile.location, 
                experience_years: profile.experience_years,
                style_tags: profile.style_tags,
                mood_tags: profile.mood_tags
              }, 
              { role: role || "any" } 
            );
            return (
              <div className={`px-4 py-1.5 rounded-full border text-[0.65rem] font-black tracking-[0.2em] shadow-2xl backdrop-blur-md uppercase ${getMatchBadgeStyle(match.tier)}`}>
                AI Match {match.score}%
              </div>
            );
          })()}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-xl text-foreground truncate">{profile.name}</h3>
          {isElite && <Crown size={14} className="text-amber-500" />}
          {(profile as any).is_verified && <CheckCircle2 size={14} className="text-blue-500" />}
        </div>
        <div className="text-primary text-[0.65rem] uppercase tracking-[0.2em] font-bold">
          {profile.role === "Admin" ? "Member" : profile.role}
        </div>
        
        <p className="text-sm text-foreground/60 line-clamp-2 leading-relaxed italic">
          "{profile.bio || "Professional talent available for casting calls."}"
        </p>

        {/* Mono metadata */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <span className="font-mono-tech">#{profile.id?.slice(0, 6).toUpperCase()}</span>
          {profile.location && (
            <span className="font-mono-tech flex items-center gap-1">
              <MapPin size={8} />{profile.location}
            </span>
          )}
          {profile.experience_years != null && (
            <span className="font-mono-tech">{profile.experience_years}YR</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
