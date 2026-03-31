import { useEffect, useState, useCallback, useRef } from "react";
import { profileService, Profile } from "@/services/profileService";
import { paymentService } from "@/services/paymentService";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bookmark, Send, Trash2, Heart, MessageCircle, X, PersonStanding, Clapperboard, Layout, MapPin, DollarSign, Crown, CheckCircle2, Video, Plus, Check, SlidersHorizontal, Image as ImageIcon, Sparkles, TrendingUp, Search, Minimize2, Edit2, MoreVertical, Share2, Flag, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import ProfileDetailDialog from "./ProfileDetailDialog";
import { SearchResultSkeleton, BentoSkeleton } from "./SkeletonCards";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVideo } from "@/contexts/VideoContext";
import { calculateSmartMatch, getMatchBadgeStyle } from "@/utils/smartMatch";

// Profile type is now imported from profileService

interface SearchPageProps {
  query?: string;
  role?: string;
  initialType?: "talents" | "projects";
  onBack: () => void;
  onTypeChange?: (type: "talents" | "projects") => void;
  onProfileClick: (profile: Partial<Profile> & { user_id: string }) => void;
  onlineUsers?: Set<string>;
  castingTapeOpen?: boolean;
  onCastingTapeOpenChange?: (open: boolean) => void;
}

export default function SearchPage({ query, role, initialType = "talents", onBack, onTypeChange, onProfileClick, onlineUsers = new Set(), castingTapeOpen = false, onCastingTapeOpenChange }: SearchPageProps) {
  const { user, profile: currentUserProfile } = useAuth();
  const [searchType, setSearchType] = useState<"talents" | "projects">(initialType);

  useEffect(() => {
    setSearchType(initialType);
  }, [initialType]);
  const [results, setResults] = useState<(Profile & { is_verified?: boolean; trending_score?: number; mood_tags?: string[]; style_tags?: string[] })[]>([]);
  const [projectResults, setProjectResults] = useState<Tables<"projects">[]>([]);
  const [trendingResults, setTrendingResults] = useState<(Profile & { is_verified?: boolean; trending_score?: number; mood_tags?: string[]; style_tags?: string[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);

  // Smart Search States
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [looksLikeQuery, setLooksLikeQuery] = useState("");
  const [isTrending, setIsTrending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [visualSearchMode, setVisualSearchMode] = useState(false);

  const moods = ['Energetic', 'Dark', 'Calm', 'Mysterious', 'Happy', 'Emotional', 'Professional'];
  const styles = ['Luxury', 'Street', 'Vintage', 'Modern', 'Minimalist', 'Commercial', 'Editorial'];
  const traits = ['Extrovert', 'Introvert', 'Charismatic', 'Thoughtful', 'Relatable', 'Bold'];

  useEffect(() => {
    const search = async () => {
      // Avoid flickering if we're already loading the exact same query
      setLoading(true);
      try {

        if (searchType === "talents") {
          const trimmedQuery = query?.trim() || "";
          
          const data = await profileService.searchProfiles({
            query: trimmedQuery,
            role,
            isTrending,
            isAdmin: currentUserProfile?.role === 'Admin',
            moods: selectedMoods,
            styles: selectedStyles,
            traits: selectedTraits,
            looksLike: looksLikeQuery
          });
          setResults(data as Profile[]);
        } else {
          let q = supabase.from("projects").select("*").eq("status", "active");
          if (query) {
            q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,requirements.ilike.%${query}%`);
          }
          const { data, error } = await q;
          if (error) throw error;
          setProjectResults(data || []);
        }
      } catch (err: any) {
        console.error("Search error details:", err);
        if (err.message?.toLowerCase().includes("jwt expired")) {
          console.warn("JWT expired. Attempting background session recovery...");
          // supabase.auth.refreshSession() happens automatically in core, 
          // but we can help it here without force signing out
          toast.info("Updating session... please wait.");
        } else {
          toast.error(`Failed to load search results: ${err.message || 'Unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    };
    search();
  }, [query, role, searchType, selectedMoods, selectedStyles, selectedTraits, isTrending, looksLikeQuery, visualSearchMode, currentUserProfile?.role]);

  // Separate effect for side-data to avoid blocking the main search
  useEffect(() => {
     if (user?.id) {
       const fetchSaved = async () => {
         try {
           const { data, error } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
           if (error) throw error;
           setSavedTalentIds(data?.map(s => s.talent_profile_id) || []);
         } catch (err) {
           console.error("Error fetching saved talents:", err);
           setSavedTalentIds([]);
         }
       };
       fetchSaved();
     }
  }, [user?.id]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await profileService.searchProfiles({
          role,
          isTrending: true,
          isAdmin: currentUserProfile?.role === 'Admin'
        });
        setTrendingResults((data || []).slice(0, 6) as Profile[]);
      } catch (err: any) {
        console.error("Trending fetch error:", err);
        if (err.message?.toLowerCase().includes("jwt expired")) {
             console.warn("Trending fetch failed: JWT expired.");
          // No action needed, AuthContext handles globally or auto-refresh will fix it on next query
        }
        setTrendingResults([]);
      }
    };
    fetchTrending();
  }, [role, currentUserProfile?.role]);

  const toggleSave = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Log in to save talents");
      return;
    }

    const isSaved = savedTalentIds.includes(profileId);
    try {
      if (isSaved) {
        await supabase.from("saved_talents").delete().eq("user_id", user.id).eq("talent_profile_id", profileId);
        setSavedTalentIds(prev => prev.filter(id => id !== profileId));
        toast.info("Talent removed from saved list");
      } else {
        await supabase.from("saved_talents").upsert({ user_id: user.id, talent_profile_id: profileId }, { onConflict: 'user_id,talent_profile_id', ignoreDuplicates: true });
        setSavedTalentIds(prev => [...prev, profileId]);
        toast.success("Talent saved successfully!");
      }
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const title = role ? `${role}s` : `Search Results for "${query || 'All'}"`;

  return (
    <motion.div
      className="max-w-[740px] mx-auto px-10 md:px-4 py-8 md:py-16"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-3 rounded-2xl bg-secondary/80 backdrop-blur-xl border border-border text-muted-foreground hover:text-primary transition-all active:scale-90 shadow-xl"
          title="Go Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex bg-secondary/80 backdrop-blur-xl p-1.5 rounded-2xl border border-border shadow-2xl self-center md:self-auto">
          <button
            onClick={() => { setSearchType("talents"); onTypeChange?.("talents"); }}
            className={`px-8 py-3 rounded-xl text-[0.7rem] font-normal uppercase tracking-[2px] transition-all duration-300 ${searchType === "talents" ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-105" : "text-muted-foreground hover:text-foreground"}`}
          >
            Talents
          </button>
          <button
            onClick={() => { setSearchType("projects"); onTypeChange?.("projects"); }}
            className={`px-8 py-3 rounded-xl text-[0.7rem] font-normal uppercase tracking-[2px] transition-all duration-300 ${searchType === "projects" ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(251,191,36,0.3)] scale-105" : "text-muted-foreground hover:text-foreground"}`}
          >
            Casting Calls
          </button>
        </div>
      </div>


      {searchType === 'talents' && (
        <div className="mb-8 md:mb-12 space-y-4 md:space-y-8 p-5 md:p-8 premium-card group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={120} className="text-primary" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6 relative z-10">
            <div className="flex items-center gap-4 md:gap-6">
              <h3 
                className="font-display text-lg md:text-2xl text-primary flex items-center gap-2 md:gap-3 cursor-pointer hover:text-primary/80 transition-all active:scale-95"
                onClick={() => setShowFilters(!showFilters)}
              >
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:border-primary/40 transition-all">
                  <SlidersHorizontal className="text-primary w-4 h-4 md:w-5 md:h-5" />
                </div>
                Smart Filters
              </h3>
              <div className="flex items-center gap-2 md:gap-3 bg-secondary/50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-border">
                <TrendingUp className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isTrending ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[0.5rem] md:text-[0.65rem] font-normal uppercase tracking-widest text-muted-foreground">Trending</span>
                  <Switch
                  checked={isTrending}
                  onCheckedChange={setIsTrending}
                  className="data-[state=checked]:bg-primary h-5 w-9 md:h-6 md:w-11"
                />
              </div>
            </div>

            <button
              onClick={() => onCastingTapeOpenChange?.(true)}
              className="group relative flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/50 px-5 py-2.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary/5"
            >
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-pulse pointer-events-none" />
              <Video className="text-primary w-4 h-4" />
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-primary">Casting Tape</span>
            </button>
          </div>

          <motion.div 
            initial={false}
            animate={{ 
              height: showFilters ? "auto" : 0,
              opacity: showFilters ? 1 : 0,
              marginTop: showFilters ? 32 : 0
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 overflow-hidden"
          >
            <div>
              <label className="block text-[0.6rem] font-normal tracking-[3px] uppercase text-primary mb-4">Mood</label>
              <div className="flex flex-wrap gap-2">
                {moods.map(m => (
                  <Badge
                    key={m}
                    variant={selectedMoods.includes(m) ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 active:scale-95 py-1.5 px-3 border-white/10 ${selectedMoods.includes(m) ? 'bg-primary text-foreground' : 'bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}
                    onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[0.6rem] font-normal tracking-[3px] uppercase text-primary mb-4">Style</label>
              <div className="flex flex-wrap gap-2">
                {styles.map(s => (
                  <Badge
                    key={s}
                    variant={selectedStyles.includes(s) ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 active:scale-95 py-1.5 px-3 border-white/10 ${selectedStyles.includes(s) ? 'bg-primary text-foreground' : 'bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}
                    onClick={() => setSelectedStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[0.6rem] font-normal tracking-[3px] uppercase text-primary mb-4">Trait</label>
              <div className="flex flex-wrap gap-2">
                {traits.map(t => (
                  <Badge
                    key={t}
                    variant={selectedTraits.includes(t) ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 active:scale-95 py-1.5 px-3 border-white/10 ${selectedTraits.includes(t) ? 'bg-primary text-foreground' : 'bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}
                    onClick={() => setSelectedTraits(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {visualSearchMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-12 p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 flex flex-col items-center text-center gap-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary relative">
            <Sparkles size={32} className="relative z-10" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping opacity-20" />
            <div className="absolute -inset-4 rounded-full border border-primary/10 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display text-3xl text-foreground mb-3">Visionary AI Discovery</h4>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Our AI analyzes facial structures, style archetypes, and visual vibes to find your perfect match.
              <span className="block mt-2 text-primary/60 font-medium">Upload a celebrity photo or a moodboard to begin.</span>
            </p>
          </div>
          <div className="flex gap-4">
            <button className="bg-primary text-foreground px-6 py-3 rounded-xl text-[0.7rem] font-normal uppercase tracking-widest flex items-center gap-3">
              <ImageIcon size={18} /> Upload Image
            </button>
            <button
              onClick={() => setVisualSearchMode(false)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-3 rounded-xl text-[0.7rem] font-normal uppercase tracking-widest transition-colors"
            >
              Disable
            </button>
          </div>
        </motion.div>
      )}

      {searchType === 'talents' && !query && selectedMoods.length === 0 && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display text-xl md:text-2xl text-foreground flex items-center gap-2 md:gap-3">
              <TrendingUp className="text-orange-500" size={20} />
              Trending {role || "Talent"}
            </h3>
            <span className="text-[0.6rem] font-normal uppercase tracking-[3px] text-muted-foreground">Updated Hourly</span>
          </div>
          <div className="bento-grid">
            {trendingResults.map((p, idx) => (
              <motion.div
                key={p.id}
                onClick={() => onProfileClick(p)}
                whileTap={{ scale: 0.96 }}
                className={`group cursor-pointer haptic-card ${idx === 0 ? 'bento-featured' : ''}`}
              >
                <div className="premium-card relative w-full h-full">
                  <div className="shimmer-accent" />
                  <div className="stitched-card-scanner" />
                  {p.photo_url ? (
                    <motion.img
                      src={p.photo_url}
                      className="w-full h-full object-cover ken-burns"
                      alt={p.name}
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center font-display text-2xl text-primary">
                      {p.name?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-white font-medium text-sm drop-shadow-md truncate">{p.name}</div>
                    <div className="text-primary text-[0.55rem] uppercase tracking-widest font-bold drop-shadow-sm">{p.role}</div>
                    <div className="font-mono-tech mt-1 text-white/40">#{p.id?.slice(0, 6).toUpperCase()}</div>
                  </div>
                  {p.trending_score && (
                    <div className="absolute top-3 right-3 bg-orange-500 text-primary-foreground text-[0.55rem] font-normal px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                      <TrendingUp size={8} /> {Math.round(p.trending_score)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-3xl md:text-5xl text-foreground mb-8 md:mb-12 tracking-tight flex items-center gap-4 md:gap-6">
        {searchType === 'talents' ? (
          <>
            {title}
            {isTrending && <Badge className="bg-orange-500 text-primary-foreground border-none px-4 py-1.5 text-xs font-normal tracking-widest animate-pulse">🔥 TRENDING</Badge>}
          </>
        ) : `Open Casting Calls`}
      </h2>

      {loading ? (
        <SearchResultSkeleton count={6} />
      ) : searchType === "talents" ? (
        results.length === 0 ? (
          <div className="text-center py-32 bg-card/30 border-2 border-dashed border-border rounded-[3rem] shadow-inner">
            <PersonStanding className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-muted-foreground font-body text-lg">No matching talent profiles found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {results.map((p) => (
              <motion.div
                key={p.id}
                onClick={() => onProfileClick(p)}
                whileTap={{ scale: 0.96 }}
                className="premium-card group haptic-card relative flex flex-row items-center gap-2 md:gap-4 px-2 md:px-6 py-2 md:py-4 transition-all cursor-pointer transform-gpu mx-auto w-full"
              >
                <div className="shimmer-accent" />
                <div className="flex flex-col items-center flex-shrink-0 relative">
                  <div className="relative group/search-avatar">
                    <div className="w-9 h-9 md:w-16 md:h-16 rounded-full bg-secondary border-2 md:border-[3px] border-primary flex items-center justify-center font-display text-xs md:text-2xl text-primary overflow-hidden shadow-lg transition-transform duration-500 group-hover:scale-110 relative">
                      <div className="stitched-card-scanner" />
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        (p.name || "U")[0].toUpperCase()
                      )}
                    </div>
                    {onlineUsers?.has(p.user_id) && (
                      <div className="absolute bottom-0 right-0 w-3 md:w-4 h-3 md:h-4 bg-green-500 rounded-full border-2 border-background shadow-lg shadow-green-500/30 z-20" />
                    )}
                  </div>
                  {(p.plan === "pro" || p.role === "Admin") && (
                    <div className="absolute -top-1.5 -left-1 md:bottom-[-6px] md:top-auto md:left-auto bg-amber-500 text-foreground text-[0.4rem] md:text-[0.5rem] font-bold px-1.5 md:px-2.5 py-0.5 rounded shadow-glow shadow-amber-500/20 tracking-tighter uppercase whitespace-nowrap z-20 border border-amber-400/30">PRO</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 md:mb-2 text-left">
                    <div className="text-sm md:text-lg font-medium text-foreground group-hover:text-primary transition-colors tracking-tight truncate flex items-center gap-2">
                      {p.name || "Unknown"}
                      {(p.plan === "pro" || p.role === "Admin") && <Crown size={12} className="text-amber-500 fill-amber-500/10" />}
                    </div>
                  </div>
                  <div className="text-primary font-normal text-[0.6rem] md:text-xs mb-1 md:mb-2 tracking-wide uppercase opacity-80 text-left">{p.role === 'Admin' ? 'Member' : (p.role || "Member")}</div>
                  {/* Call Sheet mono metadata */}
                  <div className="flex items-center gap-3 mb-1 md:mb-3">
                    <span className="font-mono-tech text-[0.6rem] text-muted-foreground">ID#{p.id?.slice(0,6).toUpperCase()}</span>
                    {p.location && <span className="font-mono-tech text-[0.6rem] text-muted-foreground">{p.location.toUpperCase()}</span>}
                  </div>
                  <div className="hidden md:flex flex-wrap gap-4 md:gap-8 mb-4">
                    {p.location && <span className="text-sm text-foreground/70 flex items-center gap-2.5 font-medium tracking-wide">📍 {p.location}</span>}
                    {p.experience_years !== null && <span className="text-sm text-foreground/70 flex items-center gap-2.5 font-medium tracking-wide">⭐ {p.experience_years}y Exp</span>}
                    {p.trending_score !== undefined && p.trending_score > 80 && (
                      <span className="text-[0.6rem] bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-full border border-orange-500/20 font-normal uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={10} /> Hot
                      </span>
                    )}
                  </div>
                  <div className="hidden md:flex flex-wrap gap-2">
                    {p.mood_tags?.slice(0, 2).map((m: string) => (
                      <span key={m} className="text-[0.6rem] bg-secondary text-secondary-foreground/80 px-2 py-0.5 rounded-md border border-border uppercase tracking-tighter font-medium">{m}</span>
                    ))}
                    {p.style_tags?.slice(0, 2).map((s: string) => (
                      <span key={s} className="text-[0.6rem] bg-primary/20 text-primary px-2 py-0.5 rounded-md border border-primary/30 uppercase tracking-tighter font-bold">{s}</span>
                    ))}
                  </div>
                  {p.bio && <p className="hidden md:block text-sm text-foreground/60 line-clamp-1 mt-4 md:mt-5 italic font-body">"{p.bio}"</p>}
                </div>

                {/* AI Smart Match Badge */}
                {query && (
                  <div className="hidden lg:flex flex-col items-end gap-1.5 px-6 py-2 border-l border-border/50">
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Match Quality</span>
                    {(() => {
                      const match = calculateSmartMatch(
                        { 
                          role: p.role, 
                          location: p.location, 
                          experience_years: p.experience_years,
                          style_tags: p.style_tags,
                          mood_tags: p.mood_tags
                        }, 
                        { role: role || query, location: query }
                      );
                      return (
                        <div className={`px-4 py-1.5 rounded-full border text-[0.75rem] font-black tracking-widest shadow-lg backdrop-blur-sm ${getMatchBadgeStyle(match.tier)}`}>
                          {match.score}%
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onProfileClick(p)}
                    className="bg-primary text-primary-foreground px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[0.6rem] md:text-[0.65rem] font-normal uppercase tracking-[1px] md:tracking-[2px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                  >
                    View
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 md:p-2.5 rounded-lg md:rounded-xl border bg-secondary/40 border-border text-muted-foreground hover:border-primary/50 transition-all outline-none">
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-card border-border p-1.5 shadow-2xl z-[50]">
                      <DropdownMenuItem 
                        onClick={(e) => toggleSave(e, p.id)}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer text-xs ${savedTalentIds.includes(p.id) ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-primary/10'}`}
                      >
                        <Bookmark size={16} fill={savedTalentIds.includes(p.id) ? "currentColor" : "none"} />
                        <span className="font-medium">{savedTalentIds.includes(p.id) ? "Unsave Talent" : "Save Talent"}</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={() => {
                          const url = `${window.location.origin}/profile/${p.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Profile link copied!");
                        }}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-primary/10 cursor-pointer text-xs"
                      >
                        <Share2 size={16} />
                        <span className="font-medium">Share Profile</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        projectResults.length === 0 ? (
          <div className="text-center py-32 bg-card/30 border-2 border-dashed border-border rounded-[3rem] shadow-inner">
            <Clapperboard className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-muted-foreground font-body text-lg">No open casting calls found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {projectResults.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )
      )}
    </motion.div>
  );
}

function ProjectCard({ project }: { project: Tables<"projects"> }) {
  const { user, isEmailVerified } = useAuth();
  const { confirm: confirmAction } = useConfirmation();
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    if (user && project.id) {
      const checkApplied = async () => {
        try {
          // Robust check: don't use maybeSingle as it might error if multiple rows exist
          const { data, count, error } = await supabase
            .from('applications' as any)
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('applicant_id', user.id);
          
          if (error) throw error;
          if (count && count > 0) setApplied(true);
        } catch (err) {
          console.error("Error checking application status:", err);
          // If checking fails, don't assume anything, but we'll try again on next mount
        }
      };
      checkApplied();
    }
  }, [user, project.id]);

  const handleApply = async () => {
    if (applied || loading) return;

    if (!isEmailVerified) {
      toast.error("Verified users only.", {
        description: "Please confirm your email to apply for roles."
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Double check before proceeding to avoid race conditions
      const { count: existingCount } = await supabase
        .from('applications' as any)
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('applicant_id', user.id);

      if (existingCount && existingCount > 0) {
        setApplied(true);
        toast.info("You've already applied for this casting call.");
        setLoading(false);
        return;
      }

      let videoUrl = null;
      if (videoFile) {
        if (videoFile.size > 50 * 1024 * 1024) {
          toast.error("Video too large (max 50MB)");
          setLoading(false);
          return;
        }
        if (!videoFile.type.startsWith('video/') && !videoFile.type.startsWith('audio/')) {
          toast.error("Invalid file type (Video/Audio only)");
          setLoading(false);
          return;
        }
        setUploadingVideo(true);
        const fileExt = videoFile.name.split('.').pop();
        const filePath = `${user.id}/auditions/${project.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, videoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        videoUrl = publicUrl;
      }

      const { error } = await supabase.from('applications' as any).insert({
        project_id: project.id,
        applicant_id: user.id,
        status: 'pending',
        video_url: videoUrl
      });

      if (error) {
        // Handle Postgres unique constraint violation
        if (error.code === '23505') {
          setApplied(true);
          toast.info("You've already applied for this casting call.");
        } else {
          throw error;
        }
      } else {
        setApplied(true);
        toast.success("Application submitted successfully!");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err.message || "Failed to submit application");
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  };

  const handleCancelApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || loading) return;

    confirmAction({
      title: "Cancel Application",
      description: "Are you sure you want to cancel your application?",
      variant: "destructive",
      confirmLabel: "Cancel Application",
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('applications' as any)
            .delete()
            .eq('project_id', project.id)
            .eq('applicant_id', user.id);

          if (error) throw error;

          setApplied(false);
          toast.success("Application cancelled successfully");
        } catch (err) {
          console.error(err);
          toast.error("Failed to cancel application");
        } finally {
          setLoading(true); // Small delay before unblocking
          setTimeout(() => setLoading(false), 500);
        }
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      className="premium-card group haptic-card transition-all relative transform-gpu h-full flex flex-col mx-auto w-full"
    >
      <div className="shimmer-accent" />
      <div className="stitched-card-scanner" />
      <div className="aspect-[16/10] md:aspect-[16/9] bg-secondary relative overflow-hidden">
        {project.thumbnail_url ? (
          <motion.img 
            src={project.thumbnail_url} 
            className="w-full h-full object-cover ken-burns" 
            alt="" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/10">
            <Layout className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-[0.55rem] font-bold uppercase tracking-[1px] shadow-2xl border border-border/20">
            {project.role_category || 'Talent'}
          </div>
          {applied && (
            <div className="bg-green-500/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[0.55rem] font-bold uppercase tracking-[1px] shadow-2xl border border-border/20 animate-in fade-in zoom-in duration-300">
              Applied
            </div>
          )}
        </div>
      </div>
      <div className="p-3 md:p-4 flex-1 flex flex-col">
        <h4 className="font-display text-sm md:text-lg text-foreground mb-1.5 group-hover:text-foreground/80 transition-colors leading-tight line-clamp-1">{project.title}</h4>
        <div className="flex flex-wrap items-center gap-2 text-[0.5rem] text-foreground/60 mb-3 font-bold uppercase tracking-[1px]">
          <span className="flex items-center gap-1 text-primary">📍 {project.location || 'Remote'}</span>
          <span className="flex items-center gap-1 text-primary">💰 {project.salary_range || 'Comp.'}</span>
        </div>
        <p className="text-[0.65rem] text-foreground/60 line-clamp-2 md:line-clamp-3 mb-4 leading-relaxed font-body flex-1">
          {project.description || "No detailed description provided."}
        </p>

        {!applied && (
          <div className="mb-6">
            <label className="block text-[0.6rem] font-normal tracking-[2px] uppercase text-primary mb-2">
              Upload Video Audition (Self-Tape)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="hidden"
                id={`video-upload-${project.id}`}
              />
              <label
                htmlFor={`video-upload-${project.id}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${videoFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                  {videoFile ? <Check size={20} /> : <Plus size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-normal truncate">
                    {videoFile ? videoFile.name : "Select self-tape..."}
                  </div>
                  <div className="text-[0.6rem] text-muted-foreground/50 uppercase tracking-wider">
                    {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : "Video or Audio · Max 50MB"}
                  </div>
                </div>
                {videoFile && (
                  <button
                    onClick={(e) => { e.preventDefault(); setVideoFile(null); }}
                    className="p-2 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </label>
            </div>
          </div>
        )}

        {applied ? (
          <div className="flex gap-3">
            <button
              disabled
              className="flex-1 py-3.5 rounded-xl text-[0.65rem] font-bold uppercase tracking-[2px] bg-green-500/10 text-green-600 border-2 border-green-500/20 cursor-default"
            >
              Application Sent
            </button>
            <button
              onClick={handleCancelApply}
              disabled={loading}
              className="px-5 py-3.5 rounded-xl text-[0.65rem] font-bold uppercase tracking-[2px] bg-red-500/10 text-red-500 border-2 border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
              title="Cancel Application"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleApply}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-[0.65rem] font-bold uppercase tracking-[2px] transition-all shadow-xl bg-secondary text-secondary-foreground border-2 border-border group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground active:scale-95"
          >
            {uploadingVideo ? 'Uploading self-tape...' : loading ? 'Submitting...' : 'Apply for this role'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function PhotoViewer({ url, onClose, user, currentUserProfile, photoOwnerId }: {
  url: string | null;
  onClose: () => void;
  user: User | null;
  currentUserProfile: Profile | null;
  photoOwnerId?: string;
}) {
  const { confirm: confirmAction } = useConfirmation();
  const { setPipVideo, setIsPipOpen } = useVideo();
  const [likes, setLikes] = useState<number>(0);
  const [userLiked, setUserLiked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number, userLiked: boolean }>>({});
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    if (url) {
      fetchEngagement();
    }
  }, [url]);

  const fetchEngagement = async () => {
    if (!url) return;

    try {
      const { count: likeCount } = await supabase
        .from('photo_likes')
        .select('*', { count: 'exact', head: true })
        .eq('photo_url', url);
      setLikes(likeCount || 0);

      if (user) {
        const { data: myLike } = await supabase
          .from('photo_likes')
          .select('*')
          .eq('photo_url', url)
          .eq('user_id', user.id)
          .maybeSingle();
        setUserLiked(!!myLike);
      }

      const { data: comms, error: commsError } = await supabase
        .from('photo_comments')
        .select(`
          *,
          profiles:user_id (name, photo_url)
        `)
        .eq('photo_url', url)
        .order('created_at', { ascending: false });

      if (commsError) {
        const { data: simpleComms } = await supabase
          .from('photo_comments')
          .select('*')
          .eq('photo_url', url)
          .order('created_at', { ascending: false });
        setComments(simpleComms || []);
      } else {
        setComments(comms || []);
        if (comms && comms.length > 0) {
          const commentIds = comms.map(c => c.id);
          const { data: allLikes } = await supabase
            .from('photo_comment_likes' as any)
            .select('comment_id, user_id')
            .in('comment_id', commentIds);

          const likesMap: Record<string, { count: number, userLiked: boolean }> = {};
          commentIds.forEach(id => {
            const fans = (allLikes as any[])?.filter(l => l.comment_id === id) || [];
            likesMap[id] = {
              count: fans.length,
              userLiked: user ? fans.some(f => f.user_id === user.id) : false
            };
          });
          setCommentLikes(likesMap);
        }
      }

      const { data: captionData } = await supabase
        .from('photo_captions')
        .select('description, user_id')
        .eq('photo_url', url)
        .maybeSingle();
      setDescription(captionData?.description || null);

      const ownerIdToFetch = photoOwnerId || (captionData as any)?.user_id;
      if (ownerIdToFetch) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('name, photo_url, role')
          .eq('user_id', ownerIdToFetch)
          .maybeSingle();
        setOwner(ownerData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async () => {
    if (!user || !url) return;
    if (userLiked) {
      await supabase.from('photo_likes').delete().eq('photo_url', url).eq('user_id', user.id);
      setUserLiked(false);
      setLikes(prev => prev - 1);
    } else {
      await supabase.from('photo_likes').upsert({ photo_url: url, user_id: user.id }, { onConflict: 'photo_url,user_id', ignoreDuplicates: true });
      setUserLiked(true);
      setLikes(prev => prev + 1);
    }
  };

  const submitComment = async () => {
    if (!user || !url || !newComment.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('photo_comments').insert({
      photo_url: url,
      user_id: user.id,
      content: newComment.trim(),
      parent_id: replyTo?.id || null
    });
    if (!error) {
      setNewComment("");
      setReplyTo(null);
      await fetchEngagement();
    }
    setLoading(false);
  };

  const handleDeleteComment = async (id: string) => {
    confirmAction({
      title: "Delete Comment",
      description: "Are you sure you want to delete this comment?",
      variant: "destructive",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const { error } = await supabase.from('photo_comments').delete().eq('id', id);
        if (!error) {
          toast.success("Comment deleted");
          setComments(prev => prev.filter(c => c.id !== id));
        } else {
          toast.error("Failed to delete comment");
        }
      }
    });
  };

  const handleUpdateComment = async (id: string) => {
    if (!editingContent.trim()) return;
    await supabase.from('photo_comments').update({ content: editingContent.trim() }).eq('id', id);
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: editingContent.trim() } : c));
    setEditingCommentId(null);
  };

  const handleLikeComment = async (id: string) => {
    if (!user) return;
    const current = commentLikes[id] || { count: 0, userLiked: false };
    const isLiking = !current.userLiked;
    setCommentLikes(prev => ({
      ...prev,
      [id]: {
        count: isLiking ? (prev[id]?.count || 0) + 1 : Math.max(0, (prev[id]?.count || 0) - 1),
        userLiked: isLiking
      }
    }));
    if (isLiking) {
      await supabase.from('photo_comment_likes' as any).upsert({ comment_id: id, user_id: user.id }, { onConflict: 'comment_id,user_id', ignoreDuplicates: true });
    } else {
      await supabase.from('photo_comment_likes' as any).delete().eq('comment_id', id).eq('user_id', user.id);
    }
  };

  const handleReply = (comment: any) => {
    const parentId = comment.parent_id || comment.id;
    setReplyTo({ id: parentId, name: comment.profiles?.name || 'User' });
    document.getElementById('comment-input')?.focus();
  };

  const renderComment = (c: any, isReply = false) => (
    <div key={c.id} className={`flex gap-3 group ${isReply ? 'ml-10 mt-3 border-l-2 border-border pl-4' : 'mt-6'}`}>
      <div className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0`}>
        {c.profiles?.photo_url ? (
          <img src={c.profiles.photo_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-primary">{c.profiles?.name?.[0] || 'U'}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-normal text-foreground">{c.profiles?.name}</div>
          <div className="text-[0.65rem] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
        </div>

        {editingCommentId === c.id ? (
          <div className="space-y-2">
            <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="w-full bg-secondary border border-primary/20 rounded-lg px-3 py-2 text-sm text-foreground outline-none" rows={2} />
            <div className="flex gap-2">
              <button onClick={() => handleUpdateComment(c.id)} className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-normal">Save</button>
              <button onClick={() => setEditingCommentId(null)} className="text-muted-foreground hover:text-white px-3 py-1 text-xs font-normal">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground leading-relaxed italic">"{c.content}"</div>
        )}

        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => handleLikeComment(c.id)} className={`flex items-center gap-1 text-[0.65rem] font-normal transition-colors ${commentLikes[c.id]?.userLiked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <Heart size={12} fill={commentLikes[c.id]?.userLiked ? "currentColor" : "none"} />
            {commentLikes[c.id]?.count || 0}
          </button>
          {!isReply && <button onClick={() => handleReply(c)} className="text-[0.65rem] font-normal text-muted-foreground hover:text-primary">Reply</button>}

          {(user && user.id === c.user_id || currentUserProfile?.role === 'Admin') && (
            <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingCommentId(c.id); setEditingContent(c.content); }} className="text-muted-foreground hover:text-primary transition-colors"><Edit2 size={12} /></button>
              <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={!!url} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl h-[95vh] md:h-[90vh] md:max-h-[850px] p-0 bg-background border-none flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-3xl">
        <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
          {url?.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || url?.includes('videos%2F') ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                src={url || ""}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                loop
              />
              <button
                onClick={() => {
                  setPipVideo({ url: url || "", title: description || "Video", owner: owner?.name });
                  setIsPipOpen(true);
                  onClose();
                  toast.info("Video minimized to Picture-in-Picture");
                }}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-primary hover:text-black text-white rounded-full transition-all z-10"
                title="Picture-in-Picture"
              >
                <Minimize2 size={20} />
              </button>
            </div>
          ) : (
            <img src={url || ""} className="max-w-full max-h-full object-contain" alt="Post" />
          )}
          <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all z-10"><X size={20} /></button>
        </div>

        <div className="w-full md:w-[400px] bg-card flex flex-col min-h-0 h-full border-t md:border-t-0 md:border-l border-border">
          <div className="p-6 border-b border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary border border-primary flex items-center justify-center font-display text-xl text-primary overflow-hidden">
              {owner?.photo_url ? <img src={owner.photo_url} className="w-full h-full object-cover" alt="" /> : (owner?.name?.[0] || '?')}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-normal text-lg text-foreground leading-none mb-1">{owner?.name || "Member"}</div>
              <div className="text-xs text-primary font-body uppercase tracking-wider">{owner?.role || "Talent"}</div>
            </div>
            <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 text-muted-foreground hover:text-primary transition-colors bg-secondary/30 rounded-lg outline-none">
                    <MoreVertical size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-card border-border p-1.5 shadow-2xl z-[600]">
                  <DropdownMenuItem 
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-primary/10 cursor-pointer text-xs group"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = url || '';
                      link.download = `media_${Date.now()}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success("Downloading media...");
                    }}
                  >
                    <Plus size={16} className="text-primary" /> 
                    <span className="font-medium">Save to Device</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-primary/10 cursor-pointer text-xs group text-red-500 hover:text-red-600"
                    onClick={() => toast.info("Report feature coming soon")}
                  >
                    <Flag size={16} /> 
                    <span className="font-medium">Report Media</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {description && <div className="text-sm text-muted-foreground leading-relaxed mb-8 italic border-l-2 border-primary/20 pl-4">{description}</div>}

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${userLiked ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:border-primary/50"}`}>
                  <Heart size={18} fill={userLiked ? "currentColor" : "none"} />
                  <span className="font-normal text-sm">{likes}</span>
                </button>
              </div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{comments.length} Comments</div>
            </div>

            <div className="space-y-6 flex-1">
              {comments.filter(c => !c.parent_id).map((c) => (
                <div key={c.id} className="group">
                  {renderComment(c)}
                  {comments.filter(r => r.parent_id === c.id).map(r => renderComment(r, true))}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-card/80 backdrop-blur-sm">
            {replyTo && (
              <div className="mb-3 flex items-center justify-between bg-primary/10 px-3 py-1.5 rounded text-xs text-primary font-normal">
                <span>Replying to {replyTo.name}</span>
                <button onClick={() => setReplyTo(null)} className="text-primary hover:text-white transition-colors"><X size={14} /></button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                id="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-all resize-none h-[42px] scrollbar-hide"
              />
              <button
                onClick={submitComment}
                disabled={loading || !newComment.trim()}
                className="bg-primary text-primary-foreground p-2 px-4 rounded-xl font-normal text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
