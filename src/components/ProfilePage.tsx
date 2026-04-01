import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { followService, FollowProfile } from "@/services/followService";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Crown, Edit2, MapPin, Briefcase, Link2, User, Camera, Sparkles, Share2, Lock, ShoppingBag, Trash2, Minimize2, Users, ChevronDown, ChevronLeft, Video } from "lucide-react";
import { useVideo } from "@/contexts/VideoContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { Badge } from "@/components/ui/badge";
import { settingsService, UserSettings } from "@/services/settingsService";
import ImageWithProtection from "@/components/ui/ImageWithProtection";
import { ShieldAlert, Ban, UserX } from "lucide-react";

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];
const GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
const COLORS = ["Black", "Brown", "Blonde", "Red", "Grey", "White", "Bald", "Blue", "Green", "Hazel", "Other"];

interface PhotoCaption {
  description: string;
  is_premium: boolean;
  price: number;
}

const RECOMMENDED_SKILLS = {
  "Acting (Primary)": [
    "Camera Acting", "Theatre Acting", "Improvisation", "Method Acting",
    "Character Development", "Emotional Performance", "Dialogue Delivery",
    "Script Analysis", "Audition Technique"
  ],
  "Direction & Filmmaking": [
    "Short Film Direction", "Visual Storytelling", "Scene Blocking",
    "Actor Coaching", "Storyboarding", "Shot Composition",
    "Screenplay Interpretation", "Assistant Direction"
  ],
  "Singing & Voice": [
    "Playback Singing", "Studio Recording", "Live Performance",
    "Voice Modulation", "Vocal Training", "Dubbing / Voice Acting"
  ],
  "Dance & Choreography": [
    "Bollywood Dance", "Contemporary Dance", "Freestyle",
    "Stage Performance", "Basic Choreography", "Movement Direction"
  ],
  "Language & Communication": [
    "English", "Hindi", "Nepali", "Accent Adaptation", "Public Speaking"
  ],
  "Physical & Performance Skills": [
    "Basic Stage Combat", "Fitness & Body Conditioning", "Yoga",
    "Swimming", "Driving (Manual & Automatic)"
  ],
  "Creative & Production": [
    "Scriptwriting", "Content Creation", "Social Media Performance", "Basic Video Editing"
  ]
};

const RECOMMENDED_TAGS = {
  Moods: ["Energetic", "Dark", "Calm", "Mysterious", "Happy", "Emotional", "Professional", "Rebellious", "Innocent"],
  Styles: ["Luxury", "Street", "Vintage", "Modern", "Minimalist", "Commercial", "Editorial", "Gothic", "Retro"],
  Personality: ["Extrovert", "Introvert", "Charismatic", "Thoughtful", "Relatable", "Bold", "Quirky", "Sophisticated"]
};

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, profile, loading, isPremium, isEmailVerified, refreshProfile } = useAuth();
  const { confirm: confirmAction } = useConfirmation();
  const { setPipVideo, setIsPipOpen } = useVideo();

  // Mode
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [captions, setCaptions] = useState<Record<string, { description: string; is_premium: boolean; price: number }>>({});
  const [digitalProducts, setDigitalProducts] = useState<any[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [looksLike, setLooksLike] = useState<string[]>([]);
  const [newLooksLike, setNewLooksLike] = useState("");
  const [expandedTagCategories, setExpandedTagCategories] = useState<string[]>(["moods"]);
  const [expandedSkillCategories, setExpandedSkillCategories] = useState<string[]>(["acting (primary)"]);

  const toggleTagCategory = (cat: string) => {
    setExpandedTagCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleSkillCategory = (cat: string) => {
    setExpandedSkillCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };
  const [visualSearchKeywords, setVisualSearchKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // Follow counts & list modal
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followList, setFollowList] = useState<FollowProfile[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  // Load follow counts on mount / profile change
  useEffect(() => {
    if (!profile?.user_id) return;
    followService.getCounts(profile.user_id).then(setFollowCounts);
  }, [profile?.user_id]);

  const openFollowModal = async (type: "followers" | "following") => {
    setFollowModal(type);
    setFollowListLoading(true);
    try {
      const list = type === "followers"
        ? await followService.getFollowers(profile!.user_id)
        : await followService.getFollowing(profile!.user_id);
      setFollowList(list);
    } catch {
      toast.error("Failed to load list");
    } finally {
      setFollowListLoading(false);
    }
  };

  // Populate form fields whenever profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone((profile as any).phone || "");
      setRole(profile.role || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setHeight(profile.height || "");
      setAge(profile.age?.toString() || "");
      setGender(profile.gender || "");
      setHairColor(profile.hair_color || "");
      setEyeColor(profile.eye_color || "");
      setExperienceYears(profile.experience_years?.toString() || "");
      setPortfolioUrl(profile.portfolio_url || "");
      setSkills(profile.skills || []);
      setMoodTags((profile as any).mood_tags || []);
      setStyleTags((profile as any).style_tags || []);
      setPersonalityTraits((profile as any).personality_traits || []);
      setLooksLike((profile as any).looks_like || []);
      setVisualSearchKeywords((profile as any).visual_search_keywords || "");

      const currentProfileId = profile.user_id;

      const fetchCaptions = async () => {
        try {
          const { data, error } = await supabase.from('photo_captions').select('*').eq('user_id', currentProfileId);
          if (error) throw error;
          if (profile.user_id !== currentProfileId) return;

          const caps: Record<string, PhotoCaption> = {};
          data?.forEach(c => {
            caps[c.photo_url] = {
              description: c.description || "",
              is_premium: !!c.is_premium,
              price: c.price || 0
            };
          });
          setCaptions(caps);
        } catch (err) {
          console.error("Error fetching captions:", err);
        }
      };

      const fetchProducts = async () => {
        try {
          const { data, error } = await (supabase.from('digital_products' as any).select('*').eq('seller_id', currentProfileId) as any);
          if (error) throw error;
          if (profile.user_id !== currentProfileId) return;
          setDigitalProducts(data || []);
        } catch (err) {
          console.error("Error fetching products:", err);
        }
      };

      fetchCaptions();
      fetchProducts();

      // Load settings
      settingsService.getSettings(currentProfileId)
        .then(res => {
          if (profile.user_id === currentProfileId) setUserSettings(res);
        })
        .catch(err => console.error("Settings load error:", err));
      
      // Check if blocked
      setIsBlocked(false);
      if (user && user.id !== currentProfileId) {
        settingsService.isBlocked(user.id, currentProfileId)
          .then(res => {
            if (profile.user_id === currentProfileId) setIsBlocked(res);
          })
          .catch(err => console.error("Block check error:", err));
      }
    }
  }, [profile, user]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-foreground/60 font-medium">Please sign in to view your profile.</div>;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-foreground/60">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[0.65rem] font-bold tracking-[4px] uppercase animate-pulse">Loading Profile...</p>
      </div>
    </div>
  );

  const handleSave = async () => {
    if (!user) return;

    if (!isEmailVerified) {
      toast.error("Verified users only.", {
        description: "Please confirm your email before updating your professional profile."
      });
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name,
        phone,
        role,
        location,
        bio, height,
        age: age && !isNaN(parseInt(age)) ? parseInt(age) : null,
        gender,
        hair_color: hairColor,
        eye_color: eyeColor,
        experience_years: experienceYears && !isNaN(parseInt(experienceYears)) ? parseInt(experienceYears) : null,
        portfolio_url: portfolioUrl,
        skills,
        mood_tags: moodTags.map(t => t.toLowerCase()),
        style_tags: styleTags.map(t => t.toLowerCase()),
        personality_traits: personalityTraits.map(t => t.toLowerCase()),
        looks_like: looksLike,
        visual_search_keywords: visualSearchKeywords,
        user_id: user.id // Required for upsert
      };
      
      // Use upsert instead of update to handle both creation and updates
      const { error } = await supabase.from("profiles").upsert(updates as any, { onConflict: 'user_id' });
      if (error) throw error;

      const captionInserts = Object.entries(captions).map(([url, data]) => ({
        photo_url: url,
        user_id: user.id,
        description: data.description,
        is_premium: data.is_premium,
        price: data.price
      }));
      if (captionInserts.length > 0) {
        await supabase.from('photo_captions').upsert(captionInserts, { onConflict: 'photo_url' });
      }

      await refreshProfile();
      toast.success("Profile updated!");
      setIsEditing(false); // ← Close the edit form after saving
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset fields back to current profile values
    if (profile) {
      setName(profile.name || "");
      setRole(profile.role || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setHeight(profile.height || "");
      setAge(profile.age?.toString() || "");
      setGender(profile.gender || "");
      setHairColor(profile.hair_color || "");
      setEyeColor(profile.eye_color || "");
      setExperienceYears(profile.experience_years?.toString() || "");
      setPortfolioUrl(profile.portfolio_url || "");
      setSkills(profile.skills || []);
      setMoodTags((profile as any).mood_tags || []);
      setStyleTags((profile as any).style_tags || []);
      setPersonalityTraits((profile as any).personality_traits || []);
      setLooksLike((profile as any).looks_like || []);
      setVisualSearchKeywords((profile as any).visual_search_keywords || "");
    }
    setIsEditing(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // ──────────────────────────────────────────────────────────────────────
  // VIEW MODE
  // ──────────────────────────────────────────────────────────────────────
  if (!isEditing) {

    return (
      <div className="bg-background min-h-screen text-white font-body selection:bg-primary/30">
        {/* ── 1. CINEMATIC HEADER ── */}
        <section className="relative h-[80vh] flex items-end overflow-hidden">
          <div className="absolute inset-0 z-0">
             <motion.img 
               initial={{ scale: 1.1 }}
               whileInView={{ scale: 1 }}
               transition={{ duration: 1.5 }}
               src={profile?.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80"} 
               className="w-full h-full object-cover"
               alt={profile?.name}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-12 pb-24">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                <div className="space-y-6">
                   <motion.div 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="flex items-center gap-3"
                   >
                      <button 
                        onClick={onBack}
                        className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:text-primary transition-all active:scale-90"
                      >
                         <ChevronLeft size={20} />
                      </button>
                      {isPremium && (
                        <div className="px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[0.6rem] font-black uppercase tracking-[0.3em] text-amber-500 shadow-2xl">
                           <Crown size={12} className="inline mr-2" /> PRO Artist
                        </div>
                      )}
                   </motion.div>

                   <motion.h1 
                     initial={{ opacity: 0, y: 30 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="font-display text-6xl md:text-8xl tracking-tighter leading-none"
                   >
                      {profile?.name?.split(' ')[0]} <br />
                      <span className="text-primary italic">{profile?.name?.split(' ').slice(1).join(' ')}</span>
                   </motion.h1>

                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ delay: 0.2 }}
                     className="flex items-center gap-6 text-[0.65rem] font-black uppercase tracking-[0.3em] text-primary/80"
                   >
                      <span>{profile?.role}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span>{profile?.location}</span>
                   </motion.div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-4"
                >
                   <button 
                     onClick={() => setIsEditing(true)}
                     className="px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                   >
                      Direct Message
                   </button>
                   <button 
                     onClick={() => setIsEditing(true)}
                     className="px-10 py-5 border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                   >
                      Edit Profile
                   </button>
                </motion.div>
             </div>
          </div>
        </section>

        {/* ── 2. PROFILE CONTENT ── */}
        <section className="py-24 px-12">
           <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                 {/* Left Sidebar: About & Specs */}
                 <div className="lg:col-span-4 space-y-12">
                    <div className="premium-card p-10 group">
                       <h3 className="text-[0.6rem] font-black uppercase tracking-[4px] text-primary/60 mb-8 border-b border-white/5 pb-4">Personal Narrative</h3>
                       <p className="text-muted-foreground font-body leading-relaxed font-light italic text-lg">
                          "{profile?.bio || "No narrative established yet."}"
                       </p>
                    </div>

                    <div className="premium-card p-10">
                       <h3 className="text-[0.6rem] font-black uppercase tracking-[4px] text-primary/60 mb-8 border-b border-white/5 pb-4">Performance Specs</h3>
                       <div className="grid grid-cols-2 gap-8">
                          {[
                            { label: "Height", val: profile?.height },
                            { label: "Weight", val: "72kg" },
                            { label: "Hair", val: profile?.hair_color },
                            { label: "Eyes", val: profile?.eye_color },
                            { label: "Age", val: profile?.age },
                            { label: "Exp", val: `${profile?.experience_years}y` }
                          ].map(spec => (
                            <div key={spec.label} className="space-y-1">
                               <div className="text-[0.55rem] font-black uppercase tracking-[2px] text-muted-foreground/40">{spec.label}</div>
                               <div className="text-sm font-bold tracking-widest uppercase">{spec.val || "—"}</div>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="premium-card p-10">
                       <h3 className="text-[0.6rem] font-black uppercase tracking-[4px] text-primary/60 mb-8 border-b border-white/5 pb-4">Digital Links</h3>
                       <div className="space-y-4">
                          <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/40 transition-all group">
                             <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">IMDb Profile</span>
                             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                                <Link2 size={14} />
                             </div>
                          </button>
                          <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-400/40 transition-all group">
                             <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Casting Tape</span>
                             <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                <Video size={14} />
                             </div>
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* Right Side: Performance Reel & Portfolio */}
                 <div className="lg:col-span-8 space-y-16">
                    {/* Performance Reel */}
                    <div className="space-y-8">
                       <div className="flex items-center justify-between mb-8">
                          <h2 className="font-display text-4xl">Performance <span className="text-primary italic">Reel</span></h2>
                          <Badge variant="outline" className="border-primary/20 text-primary uppercase tracking-[2px] px-3 py-1 font-black text-[9px]">DIRECTOR'S CUT</Badge>
                       </div>

                       <div className="aspect-video premium-card relative overflow-hidden bg-black group">
                          {((profile as any)?.videos?.[0]) ? (
                            <video src={(profile as any).videos[0]} controls className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-muted-foreground/20">
                               <Video size={80} />
                               <span className="text-[0.6rem] font-black uppercase tracking-[4px]">No video reel linked</span>
                            </div>
                          )}
                          <div className="stitched-card-scanner" />
                       </div>
                    </div>

                    {/* Stitched Lookbook (Photos) */}
                    <div className="space-y-8">
                       <div className="flex items-center justify-between mb-8">
                          <h2 className="font-display text-4xl">Stitched <span className="text-primary italic">Lookbook</span></h2>
                          <div className="flex gap-2">
                             <button className="p-3 bg-secondary/50 rounded-xl border border-white/5 text-muted-foreground hover:text-primary transition-all"><Camera size={18} /></button>
                             <button className="p-3 bg-secondary/50 rounded-xl border border-white/5 text-muted-foreground hover:text-primary transition-all"><Share2 size={18} /></button>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {((profile as any)?.photos || []).slice(0, 6).map((url: string, i: number) => (
                            <motion.div 
                              key={url}
                              whileHover={{ y: -8 }}
                              className="aspect-[3/4] premium-card overflow-hidden group/photo relative"
                            >
                               <div className="shimmer-accent" />
                               <ImageWithProtection 
                                src={url} 
                                alt={`Elena Portfolio ${i + 1}`} 
                                className="w-full h-full transform-gpu transition-transform duration-1000 group-hover/photo:scale-110"
                                watermark={userSettings?.protection.watermark}
                                preventDownload={userSettings?.protection.preventDownload}
                               />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                               <div className="absolute bottom-4 left-4 right-4 translate-y-4 group-hover/photo:translate-y-0 transition-transform opacity-0 group-hover/photo:opacity-100">
                                  <button className="w-full py-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-[0.6rem] font-black uppercase tracking-[2px] text-white">Full Screen</button>
                               </div>
                            </motion.div>
                          ))}
                       </div>
                    </div>

                    {/* Experience Milestones */}
                    <div className="premium-card p-12">
                       <div className="flex items-center gap-4 mb-12">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-2xl">
                             <Briefcase size={20} />
                          </div>
                          <h2 className="font-display text-3xl">Career <span className="text-primary italic">Milestones</span></h2>
                       </div>

                       <div className="space-y-12">
                          {[
                            { role: "Lead Actor", prod: "Cinematic Journey 2024", type: "Feature Film", status: "Completed" },
                            { role: "Supporting Role", prod: "The Spotlight Project", type: "Netflix Original", status: "Post-Prod" },
                            { role: "Protagonist", prod: "Digital Hearts", type: "Web Series", status: "Featured" }
                          ].map((milestone, i) => (
                            <div key={i} className="flex gap-8 relative group">
                               {i < 2 && <div className="absolute left-[24px] top-12 bottom-[-48px] w-px bg-white/5 group-hover:bg-primary/20 transition-colors" />}
                               <div className="w-[50px] h-[50px] rounded-full border border-white/10 bg-secondary/30 flex items-center justify-center text-[10px] font-black text-primary/40 group-hover:text-primary transition-all relative z-10 shrink-0">
                                  {2024 - i}
                               </div>
                               <div className="flex-1 pb-8 border-b border-white/5">
                                  <div className="flex items-center justify-between mb-2">
                                     <h4 className="font-display text-xl group-hover:text-primary transition-colors">{milestone.prod}</h4>
                                     <span className="text-[0.6rem] font-black uppercase tracking-[2px] text-muted-foreground/30">{milestone.status}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-[0.65rem] font-bold uppercase tracking-[2px] text-muted-foreground">
                                     <span className="text-primary/60">{milestone.role}</span>
                                     <div className="w-1 h-1 rounded-full bg-white/10" />
                                     <span>{milestone.type}</span>
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-24 px-12 border-t border-white/5 text-center bg-background">
          <div className="max-w-4xl mx-auto">
             <div className="font-display text-2xl italic tracking-tighter text-primary mb-8 opacity-20">Elena Petrov Elite Portfolio</div>
             <p className="text-[0.6rem] text-muted-foreground/20 uppercase tracking-[0.5em] font-black">© 2026 THE CAASTING NETWORK • DIGITALLY VERIFIED ARTIST</p>
          </div>
        </footer>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // EDIT MODE
  // ──────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="max-w-[800px] mx-auto px-4 md:px-6 py-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      key="edit-mode"
    >
      {/* Edit Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 bg-secondary text-foreground/70 hover:text-primary hover:bg-secondary/80 rounded-xl transition-all border border-border flex items-center justify-center shrink-0"
            title="Go Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-4xl text-foreground">Edit Profile</h1>
            <p className="text-foreground/60 text-sm mt-1">Update your professional casting profile</p>
          </div>
        </div>
        <button
          onClick={handleCancelEdit}
          className="flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors text-sm font-normal"
        >
          <X size={16} />
          Cancel
        </button>
      </div>

      <div className="space-y-6">
        {/* Profile Photo Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60 mb-5">Profile Photo</h3>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-full bg-secondary border-2 border-primary overflow-hidden flex-shrink-0 flex items-center justify-center font-display text-4xl text-primary shadow-lg shadow-primary/10">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (profile?.name || "?")[0].toUpperCase()
                )}
              </div>
            </div>
            <div className="flex-1">
              <input
                type="file"
                id="photo-upload-profile"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;
                  const fileExt = file.name.split('.').pop();
                  const filePath = `${user.id}/${Math.random()}.${fileExt}`;
                  try {
                    toast.loading("Uploading photo...");
                    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                    const { error: updateError } = await supabase.from('profiles').update({ photo_url: publicUrl }).eq('user_id', user.id);
                    if (updateError) throw updateError;
                    await refreshProfile();
                    toast.dismiss();
                    toast.success("Photo updated!");
                  } catch (err: any) {
                    toast.dismiss();
                    toast.error(err.message || "Failed to upload photo");
                  }
                }}
              />
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="photo-upload-profile"
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-body font-normal text-xs cursor-pointer hover:opacity-90 transition-all shadow-md shadow-primary/10 inline-flex items-center gap-2"
                  >
                    <Plus size={16} /> Update Photo
                  </label>
                   {profile?.photo_url && (
                    <button
                      onClick={() => {
                        confirmAction({
                          title: "Remove Profile Photo",
                          description: "Are you sure you want to remove your profile photo?",
                          variant: "destructive",
                          confirmLabel: "Remove",
                          onConfirm: async () => {
                            if (!user) return;
                            try {
                              const { error } = await supabase.from('profiles').update({ photo_url: null }).eq('user_id', user.id);
                              if (error) throw error;
                              await refreshProfile();
                              toast.success("Profile photo removed");
                            } catch (err: any) {
                              toast.error(err.message || "Failed to remove photo");
                            }
                          }
                        });
                      }}
                      className="bg-secondary/50 text-foreground/60 px-6 py-2.5 rounded-xl font-body font-normal text-xs hover:bg-red-500/10 hover:text-red-500 transition-all border border-border/50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[0.7rem] text-foreground/60 max-w-[220px]">
                  Recommended: Square JPG or PNG, at least 400×400px.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Photos Section ── */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60">Portfolio Photos</h3>
            <span className="text-[0.65rem] font-normal text-foreground/60/50">
              {(profile as any)?.photos?.length || 0} / {profile?.plan === 'pro' ? '∞' : '3'}
            </span>
          </div>
          <p className="text-[0.68rem] text-foreground/60/50 mb-4">
            {profile?.plan === 'pro' ? 'Unlimited photos (PRO)' : 'Free plan: up to 3 photos'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(profile as any)?.photos?.map((url: string, index: number) => (
              <div className="space-y-2 relative">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={url} alt={`Portfolio ${index}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        confirmAction({
                          title: "Remove Photo",
                          description: "Are you sure you want to remove this photo from your portfolio?",
                          variant: "destructive",
                          confirmLabel: "Remove",
                          onConfirm: async () => {
                            if (!user) return;
                            const newPhotos = (profile as any).photos.filter((_: any, i: number) => i !== index);
                            const { error } = await supabase.from('profiles').update({ photos: newPhotos } as any).eq('user_id', user.id);
                            if (error) toast.error(error.message);
                            else { toast.success("Photo removed"); await refreshProfile(); }
                          }
                        });
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full transition-all hover:bg-red-500 shadow-lg border border-white/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  {captions[url]?.is_premium && (
                    <div className="absolute top-2 left-2 p-1 bg-amber-500 rounded-lg text-white shadow-lg">
                      <Lock size={12} />
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={captions[url]?.description || ""}
                  onChange={(e) => setCaptions({
                    ...captions,
                    [url]: { ...(captions[url] || { is_premium: false, price: 0 }), description: e.target.value }
                  })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[0.7rem] outline-none focus:border-primary transition-colors"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setCaptions({
                      ...captions,
                      [url]: { ...(captions[url] || { description: "", price: 0 }), is_premium: !captions[url]?.is_premium }
                    })}
                    className={`flex-1 text-[0.6rem] py-1 rounded-md border transition-all ${captions[url]?.is_premium ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-background border-border text-foreground/60'}`}
                  >
                    {captions[url]?.is_premium ? 'Premium' : 'Free Content'}
                  </button>
                  {captions[url]?.is_premium && (
                    <input
                      type="number"
                      placeholder="Price"
                      value={captions[url]?.price || ""}
                      onChange={(e) => setCaptions({
                        ...captions,
                        [url]: { ...(captions[url] || { description: "", is_premium: true }), price: parseInt(e.target.value) || 0 }
                      })}
                      className="w-16 bg-background border border-border rounded-md px-2 py-1 text-[0.6rem] outline-none focus:border-amber-500 transition-colors"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Add photo slot — hidden if free limit reached */}
            {(profile?.plan === 'pro' || ((profile as any)?.photos?.length || 0) < 3) ? (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-foreground/60 hover:text-primary group">
                <Plus size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-[0.65rem] font-normal uppercase tracking-wider">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    const currentPhotos = (profile as any)?.photos || [];
                    if (profile?.plan !== 'pro' && currentPhotos.length >= 3) {
                      toast.error("Free plan allows up to 3 photos. Upgrade to PRO for unlimited!");
                      return;
                    }
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${user.id}/portfolio/${Math.random()}.${fileExt}`;
                    try {
                      toast.loading("Uploading photo...");
                      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
                      if (uploadError) throw uploadError;
                      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

                      const { data: latestProfile } = await supabase.from('profiles').select('photos').eq('user_id', user.id).single();
                      const latestPhotos = (latestProfile as any)?.photos || [];

                      const { error: updateError } = await supabase.from('profiles').update({ photos: [...latestPhotos, publicUrl] } as any).eq('user_id', user.id);
                      if (updateError) throw updateError;
                      await refreshProfile();
                      toast.dismiss();
                      toast.success("Portfolio updated!");
                    } catch (err: any) {
                      toast.dismiss();
                      toast.error(err.message || "Failed to upload");
                    }
                  }}
                />
              </label>
            ) : (
              /* Locked slot — upgrade CTA */
              <div className="aspect-square rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center gap-2 text-center p-2">
                <Crown size={20} className="text-amber-500" />
                <span className="text-[0.6rem] font-normal text-amber-500 uppercase tracking-wider leading-tight">3/3 Photos<br />Upgrade for more</span>
              </div>
            )}
          </div>

          {/* Upgrade banner when at limit */}
          {profile?.plan !== 'pro' && ((profile as any)?.photos?.length || 0) >= 3 && (
            <div className="mt-4 flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <Crown size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-200/80 flex-1">Upgrade to <span className="font-normal uppercase text-amber-400">PRO</span> to upload unlimited photos.</p>
            </div>
          )}
        </div>

        {/* ── Video Reel Section ── */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60">Video Reel</h3>
            <span className="text-[0.65rem] font-normal text-foreground/60/50">
              {(profile as any)?.videos?.length || 0} / {profile?.plan === 'pro' ? '∞' : '1'}
            </span>
          </div>
          <p className="text-[0.68rem] text-foreground/60/50 mb-4">
            {profile?.plan === 'pro' ? 'Unlimited videos (PRO)' : 'Free plan: 1 video. Upgrade for more.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {(profile as any)?.videos?.map((url: string, index: number) => (
              <div key={index} className="relative group">
                <video src={url} controls className="w-full rounded-xl border border-border bg-black" />
                <button
                  onClick={async () => {
                    if (!user) return;
                    const newVideos = (profile as any).videos.filter((_: any, i: number) => i !== index);
                    const { error } = await supabase.from('profiles').update({ videos: newVideos } as any).eq('user_id', user.id);
                    if (error) toast.error(error.message);
                    else { toast.success("Video removed"); await refreshProfile(); }
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full transition-all hover:bg-red-500 shadow-lg border border-white/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add video slot */}
          {(profile?.plan === 'pro' || ((profile as any)?.videos?.length || 0) < 1) ? (
            <label className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl px-5 py-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-foreground/60 hover:text-primary group w-full">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <div className="text-sm font-normal">Upload Video</div>
                <div className="text-[0.68rem] text-foreground/60/60">MP4, MOV, WebM · Max 100MB</div>
              </div>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;
                  const currentVideos = (profile as any)?.videos || [];
                  if (profile?.plan !== 'pro' && currentVideos.length >= 1) {
                    toast.error("Free plan allows 1 video. Upgrade to PRO for unlimited!");
                    return;
                  }
                  if (file.size > 100 * 1024 * 1024) {
                    toast.error("Video must be under 100MB");
                    return;
                  }
                  const fileExt = file.name.split('.').pop();
                  const filePath = `${user.id}/videos/${Math.random()}.${fileExt}`;
                  try {
                    toast.loading("Uploading video… this may take a moment");
                    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                    const { error: updateError } = await supabase.from('profiles').update({ videos: [...currentVideos, publicUrl] } as any).eq('user_id', user.id);
                    if (updateError) throw updateError;
                    await refreshProfile();
                    toast.dismiss();
                    toast.success("Video added to your reel!");
                  } catch (err: any) {
                    toast.dismiss();
                    toast.error(err.message || "Failed to upload video");
                  }
                }}
              />
            </label>
          ) : (
            /* Lock — free user hit 1-video limit */
            <div className="flex items-center gap-4 border-2 border-dashed border-amber-500/30 bg-amber-500/5 rounded-xl px-5 py-4">
              <Crown size={22} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-normal text-amber-400">Video limit reached</div>
                <div className="text-[0.68rem] text-amber-200/70 mt-0.5">Upgrade to <span className="font-normal uppercase text-amber-400">PRO</span> to upload unlimited videos and stand out to casting directors.</div>
              </div>
            </div>
          )}
        </div>


        {/* Basic Info */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60 mb-5">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="FULL NAME" value={name} onChange={setName} />
            <Field label="PHONE (FOR SMS ALERTS)" value={phone} onChange={setPhone} placeholder="+977..." />
            <SelectField label="PRIMARY ROLE" value={role} onChange={setRole} options={ROLES} />
            <Field label="LOCATION" value={location} onChange={setLocation} placeholder="e.g. Mumbai, India" />
            <Field label="EMAIL (READ ONLY)" value={profile?.email || ""} onChange={() => { }} disabled />
          </div>
          <div className="mt-4">
            <label className="block text-[0.76rem] text-foreground/60 font-normal tracking-wider mb-1">BIO</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Your professional summary..."
              className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors resize-y"
            />
          </div>
        </div>

        {/* Smart Tags Section (Edit Mode) */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60 mb-5 flex items-center justify-between">
            Smart Search Tags
            <Sparkles size={14} className="text-primary/40" />
          </h3>

          <div className="space-y-6">
            <div>
              <button 
                onClick={() => toggleTagCategory('moods')}
                className="w-full flex items-center justify-between py-2 text-[0.65rem] text-primary font-bold tracking-widest uppercase hover:opacity-80 transition-opacity"
              >
                Moods
                <ChevronDown size={14} className={`transition-transform duration-300 ${expandedTagCategories.includes('moods') ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedTagCategories.includes('moods') && (
                  <motion.div 
                    key="moods"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-4">
                      {RECOMMENDED_TAGS.Moods.map(t => {
                        const isSelected = moodTags.includes(t.toLowerCase());
                        return (
                          <button
                            key={t}
                            onClick={() => setMoodTags(isSelected ? moodTags.filter(x => x !== t.toLowerCase()) : [...moodTags, t.toLowerCase()])}
                            className={`px-3 py-1.5 rounded-lg text-[0.68rem] transition-all border ${isSelected ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-foreground/60 hover:border-primary/50"}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <button 
                onClick={() => toggleTagCategory('styles')}
                className="w-full flex items-center justify-between py-2 text-[0.65rem] text-primary font-bold tracking-widest uppercase hover:opacity-80 transition-opacity"
              >
                Styles
                <ChevronDown size={14} className={`transition-transform duration-300 ${expandedTagCategories.includes('styles') ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedTagCategories.includes('styles') && (
                  <motion.div 
                    key="styles"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-4">
                      {RECOMMENDED_TAGS.Styles.map(t => {
                        const isSelected = styleTags.includes(t.toLowerCase());
                        return (
                          <button
                            key={t}
                            onClick={() => setStyleTags(isSelected ? styleTags.filter(x => x !== t.toLowerCase()) : [...styleTags, t.toLowerCase()])}
                            className={`px-3 py-1.5 rounded-lg text-[0.68rem] transition-all border ${isSelected ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-foreground/60 hover:border-primary/50"}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <button 
                onClick={() => toggleTagCategory('personality')}
                className="w-full flex items-center justify-between py-2 text-[0.65rem] text-primary font-bold tracking-widest uppercase hover:opacity-80 transition-opacity"
              >
                Personality
                <ChevronDown size={14} className={`transition-transform duration-300 ${expandedTagCategories.includes('personality') ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedTagCategories.includes('personality') && (
                  <motion.div 
                    key="personality"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-2 pb-4">
                      {RECOMMENDED_TAGS.Personality.map(t => {
                        const isSelected = personalityTraits.includes(t.toLowerCase());
                        return (
                          <button
                            key={t}
                            onClick={() => setPersonalityTraits(isSelected ? personalityTraits.filter(x => x !== t.toLowerCase()) : [...personalityTraits, t.toLowerCase()])}
                            className={`px-3 py-1.5 rounded-lg text-[0.68rem] transition-all border ${isSelected ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-foreground/60 hover:border-primary/50"}`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2">
              <label className="block text-[0.65rem] text-foreground/60 font-normal tracking-wider mb-2 uppercase">Looks Like (Celebrity or Character Type)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {looksLike.map(t => (
                  <Badge key={t} variant="secondary" className="bg-secondary/40 text-white gap-1.5 py-1 px-2.5">
                    {t}
                    <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => setLooksLike(looksLike.filter(x => x !== t))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLooksLike}
                  onChange={(e) => setNewLooksLike(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (newLooksLike.trim() && !looksLike.includes(newLooksLike.trim()) && (setLooksLike([...looksLike, newLooksLike.trim()]), setNewLooksLike("")))}
                  placeholder="e.g. Brad Pitt, Young Hero..."
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => newLooksLike.trim() && !looksLike.includes(newLooksLike.trim()) && (setLooksLike([...looksLike, newLooksLike.trim()]), setNewLooksLike(""))}
                  className="bg-secondary p-2 rounded-lg border border-border hover:border-primary/30"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[0.65rem] text-foreground/60 font-normal tracking-wider mb-2 uppercase">Visual Search Keywords (Hidden from public)</label>
              <textarea
                value={visualSearchKeywords}
                onChange={(e) => setVisualSearchKeywords(e.target.value)}
                placeholder="beard, muscular, long hair, spectacles..."
                rows={2}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        </div>

        {/* Physical Attributes */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60 mb-5">Physical Attributes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="HEIGHT" value={height} onChange={setHeight} placeholder="e.g. 5'10" />
            <Field label="AGE" value={age} onChange={setAge} type="number" placeholder="Years" />
            <SelectField label="GENDER" value={gender} onChange={setGender} options={GENDERS} />
            <SelectField label="HAIR COLOR" value={hairColor} onChange={setHairColor} options={COLORS} />
            <SelectField label="EYE COLOR" value={eyeColor} onChange={setEyeColor} options={COLORS} />
          </div>
        </div>

        {/* Professional */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-foreground/60 mb-5">Professional Experience</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="YEARS OF EXPERIENCE" value={experienceYears} onChange={setExperienceYears} type="number" />
            <Field label="PORTFOLIO / IMDB URL" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://..." />
          </div>

          <div>
            <label className="block text-[0.76rem] text-foreground/60 font-normal tracking-wider mb-2">SKILLS & SPECIALTIES</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.map((skill) => (
                <span key={skill} className="bg-primary border border-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-normal flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                  {skill}
                  <X size={14} className="cursor-pointer hover:text-white/70" onClick={() => removeSkill(skill)} />
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a custom skill..."
                className="flex-1 bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={addSkill}
                className="bg-secondary text-primary px-4 py-2 rounded-lg font-normal text-xs hover:bg-secondary/80 border-[1.5px] border-border hover:border-primary/30 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <h4 className="text-[0.65rem] font-bold tracking-[2px] uppercase text-primary mb-2">Quick Add Skills</h4>
              {Object.entries(RECOMMENDED_SKILLS).map(([category, categorySkills]) => {
                const catKey = category.toLowerCase();
                const isExpanded = expandedSkillCategories.includes(catKey);
                return (
                  <div key={category} className="pb-1">
                    <button 
                      onClick={() => toggleSkillCategory(catKey)}
                      className="w-full flex items-center justify-between py-1.5 group"
                    >
                      <div className="text-[0.7rem] font-bold text-primary/80 flex items-center gap-2 group-hover:text-primary transition-colors uppercase tracking-widest">
                        <span className={`w-1 h-1 rounded-full ${isExpanded ? 'bg-primary' : 'bg-primary/30'}`} />
                        {category}
                      </div>
                      <ChevronDown size={14} className={`text-foreground/40 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          key={catKey}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-1.5 pt-2 pb-3">
                            {categorySkills.map((s) => {
                              const isSelected = skills.includes(s);
                              return (
                                <button
                                  key={s}
                                  onClick={() => isSelected ? removeSkill(s) : setSkills([...skills, s])}
                                  className={`px-3 py-1.5 rounded-lg text-[0.68rem] font-medium transition-all border ${isSelected
                                    ? "bg-primary/10 border-primary text-primary shadow-sm"
                                    : "bg-background border-border text-foreground/60 hover:border-primary/50 hover:text-primary"
                                    }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save / Cancel buttons */}
        <div className="flex items-center justify-between pt-4 pb-8 gap-4">
          <button
            onClick={handleCancelEdit}
            className="px-8 py-3 rounded-xl border border-border text-foreground/60 hover:text-white hover:border-white/20 transition-all font-normal text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground rounded-xl px-12 py-3.5 font-body font-normal text-sm hover:opacity-85 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper components
// ──────────────────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-center">
      <div className="text-[0.6rem] font-bold tracking-[0.2em] uppercase text-white/40 mb-2">{label}</div>
      <div className="text-lg font-display text-white">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[0.76rem] text-foreground/60 font-normal tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-[0.76rem] text-foreground/60 font-normal tracking-wider mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors appearance-none"
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
