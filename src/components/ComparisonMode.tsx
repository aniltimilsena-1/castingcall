import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Crown, CheckCircle2, Clock, Ruler, Briefcase, Users } from "lucide-react";
import { type Profile } from "@/services/profileService";

interface ComparisonModeProps {
  profiles: Profile[];
  open: boolean;
  onClose: () => void;
  onProfileClick: (profile: Profile) => void;
}

const COMPARE_FIELDS = [
  { key: "role", label: "ROLE", icon: Briefcase },
  { key: "location", label: "LOCATION", icon: MapPin },
  { key: "experience_years", label: "EXPERIENCE", icon: Clock, suffix: " years" },
  { key: "height", label: "HEIGHT", icon: Ruler },
  { key: "age", label: "AGE", icon: Users },
  { key: "gender", label: "GENDER", icon: Users },
] as const;

export default function ComparisonMode({ profiles, open, onClose, onProfileClick }: ComparisonModeProps) {
  if (!open || profiles.length < 2) return null;

  const cols = Math.min(profiles.length, 3);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-md border-b border-border">
            <div>
              <h2 className="font-display text-lg text-foreground">Comparison Mode</h2>
              <p className="text-[0.6rem] text-muted-foreground uppercase tracking-[0.3em]">
                {profiles.length} TALENTS SELECTED
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-w-5xl mx-auto p-6">
            {/* Profile headers */}
            <div className={`grid gap-4 mb-8`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {profiles.slice(0, cols).map((p, i) => {
                const isElite = p.plan === "pro" || p.role === "Admin";
                return (
                  <motion.div
                    key={p.id || p.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => onProfileClick(p)}
                    className="cursor-pointer group bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 transition-all"
                  >
                    {/* Avatar */}
                    <div className={`w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-2 ${isElite ? "border-amber-500/40" : "border-border"}`}>
                      {p.photo_url ? (
                        <img src={p.photo_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary font-display text-2xl text-primary/20">
                          {p.name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h3 className="font-display text-lg text-foreground truncate">{p.name}</h3>
                      {isElite && <Crown size={12} className="text-amber-500" />}
                      {p.is_verified && <CheckCircle2 size={12} className="text-blue-500" />}
                    </div>
                    <p className="text-[0.6rem] text-primary uppercase tracking-[0.2em] font-bold">
                      {p.role === "Admin" ? "Member" : p.role}
                    </p>
                    <div className="font-mono-tech text-[9px] text-muted-foreground/40 mt-2">
                      ID#{(p.id || p.user_id)?.slice(0, 8).toUpperCase()}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {COMPARE_FIELDS.map(({ key, label, icon: Icon, suffix }, fi) => (
                <div
                  key={key}
                  className={`grid gap-4 ${fi % 2 === 0 ? "bg-foreground/[0.02]" : ""}`}
                  style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}
                >
                  {/* Label */}
                  <div className="flex items-center gap-2 px-4 py-4 border-r border-border">
                    <Icon size={12} className="text-muted-foreground/50" />
                    <span className="font-mono-tech text-[10px]">{label}</span>
                  </div>
                  
                  {/* Values */}
                  {profiles.slice(0, cols).map((p, pi) => {
                    const val = (p as any)[key];
                    const displayVal = val != null && val !== "" ? `${val}${suffix || ""}` : "—";
                    
                    // Highlight differences
                    const values = profiles.slice(0, cols).map(pr => (pr as any)[key]?.toString() || "");
                    const allSame = values.every(v => v === values[0]);
                    const isBest = key === "experience_years" && val === Math.max(...profiles.slice(0, cols).map(pr => (pr as any)[key] || 0).filter(Boolean));

                    return (
                      <div
                        key={pi}
                        className={`px-4 py-4 text-sm flex items-center ${
                          !allSame && val ? "text-primary font-semibold" : "text-foreground/70"
                        } ${isBest ? "bg-primary/5" : ""} ${pi < cols - 1 ? "border-r border-border" : ""}`}
                      >
                        {displayVal}
                        {isBest && <span className="ml-2 text-[8px] text-primary uppercase font-mono-tech">BEST</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Bio comparison */}
            <div className="mt-6">
              <h4 className="font-mono-tech text-[10px] text-muted-foreground mb-4 uppercase tracking-widest">BIO COMPARISON</h4>
              <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {profiles.slice(0, cols).map((p, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-foreground/70 italic leading-relaxed">
                      "{p.bio || "No bio provided."}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
