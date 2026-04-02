import { useEffect, useState, useCallback, useRef } from "react";
import { profileService, Profile } from "@/services/profileService";
import { paymentService } from "@/services/paymentService";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bookmark, Send, Trash2, Heart, MessageCircle, X, PersonStanding, Clapperboard, Layout, MapPin, DollarSign, Crown, CheckCircle2, Video, Plus, Check, SlidersHorizontal, Image as ImageIcon, Sparkles, TrendingUp, Search, Minimize2, Edit2, MoreVertical, Share2, Flag, ChevronLeft, ChevronRight } from "lucide-react";
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
  const { user, profile: currentUserProfile, isEmailVerified } = useAuth();
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
    <div className="min-h-screen bg-[#f0f2f5] pt-24 pb-24 font-sans text-black">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-6">
        {/* ── SIDEBAR FILTERS (Facebook Style) ── */}
        <aside className="w-full md:w-[320px] shrink-0 bg-white rounded-[1rem] p-6 shadow-sm border border-gray-200/60 h-auto self-start">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <button 
              onClick={onBack}
              className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-bold text-xl text-black">Search Filters</h1>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setSearchType("talents"); onTypeChange?.("talents"); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${searchType === "talents" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-black"}`}
            >
              People
            </button>
            <button
              onClick={() => { setSearchType("projects"); onTypeChange?.("projects"); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${searchType === "projects" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-black"}`}
            >
              Castings
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-gray-900 font-bold mb-3">Categories</h3>
            <div className="space-y-2">
              {['Actors', 'Models', 'Voiceover', 'Dancers', 'Musicians'].map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg group">
                  <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${role?.includes(cat.slice(0, -1)) ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                    {role?.includes(cat.slice(0, -1)) && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <span className={`text-[15px] ${role?.includes(cat.slice(0, -1)) ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6 border-t border-gray-100 pt-6">
            <h3 className="text-gray-900 font-bold mb-3">Mood & Vibe</h3>
            <div className="flex flex-wrap gap-2">
              {moods.map(m => (
                <button
                  key={m}
                  className={`cursor-pointer transition-all py-1.5 px-3 rounded-full text-[13px] font-medium border ${selectedMoods.includes(m) ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-900 font-bold">Smart Match</h3>
              <Switch
                checked={isTrending}
                onCheckedChange={setIsTrending}
                className="data-[state=checked]:bg-blue-600 h-5 w-9"
              />
            </div>
            <p className="text-[12px] text-gray-500">Enable AI-driven matching based on your production requirements.</p>
          </div>

          <button 
            onClick={() => {
              setSelectedMoods([]);
              setSelectedStyles([]);
              setSelectedTraits([]);
              setIsTrending(false);
            }}
            className="w-full py-3 text-[13px] font-bold text-gray-500 hover:text-gray-800 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200 mt-6"
          >
            Clear Filters
          </button>
        </aside>

        {/* ── MAIN RESULTS AREA ── */}
        <main className="flex-1 w-full space-y-6">
          {/* Top Search Bar Refinement */}
          <div className="bg-white rounded-[1rem] p-4 shadow-sm border border-gray-200/60 sticky top-[80px] z-[50]">
            <div className="flex items-center relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-all" />
              <input 
                type="text" 
                placeholder={`Search ${searchType}...`}
                className="w-full bg-gray-100 border-none rounded-full pl-12 pr-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500/20 text-black placeholder:text-gray-500 transition-all"
                value={query || ""}
                readOnly
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-[1.25rem] p-4 flex items-center gap-4 animate-pulse shadow-sm h-[6.5rem]">
                  <div className="w-[4.5rem] h-[4.5rem] bg-gray-200 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {searchType === "talents" ? (
                results.length === 0 ? (
                  <div className="bg-white rounded-[1rem] shadow-sm border border-gray-200/60 py-20 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-[#111] font-bold text-lg mb-1">No results found</h3>
                    <p className="text-gray-500 text-sm">We couldn't find any talents matching your search.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="px-1 pt-2 pb-1 text-sm font-semibold text-gray-500">
                      Found {results.length} people
                    </div>
                    {results.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => onProfileClick(p)}
                        className="bg-white rounded-[1.25rem] p-3 md:p-4 flex items-center pr-6 cursor-pointer shadow-sm border border-gray-100 hover:shadow-md transform transition-all active:scale-[0.99]"
                      >
                        <div className="w-[4.5rem] h-[4.5rem] md:w-[5.5rem] md:h-[5.5rem] rounded-full overflow-hidden shrink-0 shadow-inner mr-4 md:mr-6 bg-white border border-gray-200 flex items-center justify-center">
                          {p.photo_url ? (
                            <img 
                              src={p.photo_url} 
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-display font-extrabold text-gray-800 text-3xl md:text-4xl">
                              {(p.name || "U").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#111] text-lg md:text-xl leading-tight mb-1 truncate">{p.name || "Unknown"}</h3>
                          <div className="flex items-center gap-2 flex-wrap pb-0.5">
                            <span className="text-gray-600 font-medium text-[13px]">{(p.role === 'Admin' ? 'Member' : p.role)?.replace('/', '') || "Talent"}</span>
                            {p.location && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500 text-[13px]">{p.location}</span>
                              </>
                            )}
                          </div>
                          {(p.plan === "pro" || p.role === "Admin") && (
                            <div className="mt-1.5 flex">
                              <span className="text-xs font-bold text-[#0066cc] bg-blue-50 px-2 py-0.5 rounded-md">PRO VERIFIED</span>
                            </div>
                          )}
                        </div>

                        <button 
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-[13px] rounded-lg transition-colors ml-4 shrink-0"
                        >
                          View Profile
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {projectResults.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white p-4 rounded-[1rem] shadow-sm border border-gray-100 mt-6 pt-4">
            <button className="px-4 py-2 rounded-lg font-semibold text-[14px] text-gray-600 hover:bg-gray-100 transition-colors">Previous</button>
            <div className="flex items-center gap-1">
              <button className="w-9 h-9 rounded-full bg-[#0066cc] text-white font-bold text-[14px]">1</button>
              <button className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600 font-bold text-[14px] transition-colors">2</button>
              <button className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600 font-bold text-[14px] transition-colors">3</button>
            </div>
            <button className="px-4 py-2 rounded-lg font-semibold text-[14px] text-blue-600 hover:bg-blue-50 transition-colors">Next</button>
          </div>
        </main>
      </div>
    </div>
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

    if (!user) {
      toast.error("Please sign in to apply for roles", {
        description: "Join the community to start your casting journey."
      });
      return;
    }

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
  const { isEmailVerified } = useAuth();
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
    if (!user || !url) {
      toast.error("Please sign in to like photos");
      return;
    }

    if (!isEmailVerified) {
      toast.error("Verified users only.", {
        description: "Confirm your email to like posts."
      });
      return;
    }

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
    if (!user || !url) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!isEmailVerified) {
      toast.error("Verified users only.", {
        description: "Confirm your email to post comments."
      });
      return;
    }

    if (!newComment.trim()) return;
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
