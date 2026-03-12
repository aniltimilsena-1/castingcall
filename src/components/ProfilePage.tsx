import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { followService, FollowProfile } from "@/services/followService";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Crown, Edit2, MapPin, Briefcase, Link2, User, Camera, Sparkles, Share2, Lock, ShoppingBag, Trash2, Minimize2, Users } from "lucide-react";
import { useVideo } from "@/contexts/VideoContext";
import { Badge } from "@/components/ui/badge";

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];
const GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"];
const COLORS = ["Black", "Brown", "Blonde", "Red", "Grey", "White", "Bald", "Blue", "Green", "Hazel", "Other"];

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
  const { user, profile, isPremium, refreshProfile } = useAuth();
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
  const [visualSearchKeywords, setVisualSearchKeywords] = useState("");
  const [saving, setSaving] = useState(false);

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

      const fetchCaptions = async () => {
        try {
          const { data } = await supabase.from('photo_captions').select('photo_url, description, is_premium, price').eq('user_id', profile.user_id);
          const caps: Record<string, { description: string; is_premium: boolean; price: number }> = {};
          data?.forEach(c => caps[c.photo_url] = {
            description: c.description || "",
            is_premium: !!c.is_premium,
            price: c.price || 0
          });
          setCaptions(caps);
        } catch (err) {
          console.error("Error fetching captions:", err);
        }
      };

      const fetchProducts = async () => {
        try {
          const { data } = await supabase.from('digital_products' as any).select('*').eq('seller_id', profile.user_id);
          setDigitalProducts(data || []);
        } catch (err) {
          console.error("Error fetching products:", err);
        }
      };

      fetchCaptions();
      fetchProducts();
    }
  }, [profile]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Please sign in to view your profile.</div>;
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[0.65rem] font-normal tracking-[4px] uppercase animate-pulse">Loading Profile...</p>
      </div>
    </div>
  );

  const handleSave = async () => {
    if (!user) return;
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
        visual_search_keywords: visualSearchKeywords
      };
      const { error } = await supabase.from("profiles").update(updates as any).eq("user_id", user.id);
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
      <>
      <motion.div
        className="max-w-[860px] mx-auto px-4 md:px-6 py-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        key="view-mode"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors text-sm font-normal flex items-center gap-1.5">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/profile/${profile?.user_id}`;
                navigator.clipboard.writeText(url);
                toast.success("Profile link copied to clipboard!");
              }}
              className="flex items-center gap-2 bg-secondary border border-border hover:border-primary hover:text-primary text-muted-foreground px-5 py-2.5 rounded-xl font-normal text-sm transition-all"
            >
              <Share2 size={15} />
              Share Link
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-secondary border border-border hover:border-primary hover:text-primary text-muted-foreground px-5 py-2.5 rounded-xl font-normal text-sm transition-all"
            >
              <Edit2 size={15} />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-card border border-card-border rounded-3xl overflow-hidden mb-6 shadow-xl">
          {/* Top Banner */}
          <div className="h-28 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
            <div className="absolute -bottom-14 left-6 md:left-10">
              <div className="w-28 h-28 rounded-full bg-secondary border-4 border-card overflow-hidden shadow-xl flex items-center justify-center font-display text-5xl text-primary">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (profile?.name || "?")[0].toUpperCase()
                )}
              </div>
            </div>

            {/* Photo upload button */}
            <label className="absolute bottom-3 left-40 md:left-44 cursor-pointer">
              <div className="bg-secondary/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-primary hover:border-primary px-3 py-1.5 rounded-full text-[0.65rem] font-normal flex items-center gap-1.5 transition-all">
                <Camera size={12} />
                Change Photo
              </div>
              <input
                type="file"
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
            </label>
          </div>

          <div className="pt-16 pb-8 px-6 md:px-10">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="font-body font-normal text-3xl md:text-4xl text-foreground tracking-normal">{profile?.name || "Your Name"}</h1>
              {isPremium && (
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1 rounded-full text-[0.6rem] font-normal tracking-widest uppercase flex items-center gap-1.5 mt-1">
                  <Crown size={11} strokeWidth={3} /> {profile?.role === 'Admin' ? 'ADMIN PRO' : 'PRO Member'}
                </span>
              )}
            </div>
            <div className="text-primary font-normal text-sm uppercase tracking-[2px] mb-3">{profile?.role || "Role not set"}</div>

            {/* ── Followers / Following row ── */}
            <div className="flex items-center gap-5 mb-4">
              <button
                onClick={() => openFollowModal("followers")}
                className="flex flex-col items-start hover:opacity-70 transition-opacity"
              >
                <span className="text-xl font-display text-white leading-tight">{followCounts.followers.toLocaleString()}</span>
                <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Followers</span>
              </button>
              <div className="w-px h-8 bg-white/10" />
              <button
                onClick={() => openFollowModal("following")}
                className="flex flex-col items-start hover:opacity-70 transition-opacity"
              >
                <span className="text-xl font-display text-white leading-tight">{followCounts.following.toLocaleString()}</span>
                <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Following</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-5">
              {profile?.location && (
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary/60" />{profile.location}</span>
              )}
              {profile?.experience_years != null && (
                <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-primary/60" />{profile.experience_years} yrs experience</span>
              )}
              {profile?.portfolio_url && (
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <Link2 size={14} className="text-primary/60" />Portfolio / IMDB
                </a>
              )}
            </div>

            {profile?.bio ? (
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl italic border-l-2 border-primary/20 pl-4">
                "{profile.bio}"
              </p>
            ) : (
              <p className="text-muted-foreground/40 text-sm italic">No bio added yet. Click Edit Profile to add one.</p>
            )}
          </div>
        </div>

        {/* Smart Tags Section (View Mode) */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-2xl p-6 mb-6">
          <h3 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-primary/60 mb-4 flex items-center gap-2">
            <Sparkles size={14} /> Smart Search Tags
          </h3>
          <div className="space-y-4">
            {moodTags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mr-2">Moods:</span>
                {(moodTags || []).map(t => <Badge key={t} variant="secondary" className="bg-secondary/40 text-white font-normal text-[0.65rem]">{t}</Badge>)}
              </div>
            )}
            {styleTags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mr-2">Style:</span>
                {(styleTags || []).map(t => <Badge key={t} variant="secondary" className="bg-primary/20 text-primary border-primary/20 font-normal text-[0.65rem]">{t}</Badge>)}
              </div>
            )}
            {personalityTraits.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mr-2">Traits:</span>
                {(personalityTraits || []).map(t => <Badge key={t} variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 font-normal text-[0.65rem]">{t}</Badge>)}
              </div>
            )}
            {looksLike.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mr-2">Looks Like:</span>
                {(looksLike || []).map(t => <Badge key={t} variant="outline" className="border-white/10 text-muted-foreground font-normal text-[0.65rem]">{t}</Badge>)}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        {(profile?.height || profile?.age || profile?.gender || profile?.hair_color || profile?.eye_color) && (
          <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
            <h3 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Physical Attributes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {profile?.height && <Stat label="Height" value={profile.height} />}
              {profile?.age != null && <Stat label="Age" value={`${profile.age} yrs`} />}
              {profile?.gender && <Stat label="Gender" value={profile.gender} />}
              {profile?.hair_color && <Stat label="Hair" value={profile.hair_color} />}
              {profile?.eye_color && <Stat label="Eyes" value={profile.eye_color} />}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile?.skills && profile.skills.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
            <h3 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Skills & Specialties</h3>
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).map((skill) => (
                <span key={skill} className="bg-primary/5 text-primary text-xs font-medium px-3 py-1.5 rounded-xl border border-primary/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {(profile as any)?.photos?.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
            <h3 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Portfolio Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {((profile as any)?.photos || []).map((url: string, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {(profile as any)?.videos?.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
            <h3 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-4">Video Reel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {((profile as any)?.videos || []).map((url: string, i: number) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-border bg-black">
                  <video src={url} controls className="w-full h-full" />
                  <button
                    onClick={() => {
                      setPipVideo({ url, title: "Talent Reel", owner: profile?.name });
                      setIsPipOpen(true);
                      toast.info("Video minimized to Picture-in-Picture");
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-primary hover:text-black text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Picture-in-Picture"
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit CTA at bottom */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-10 py-3.5 rounded-xl font-normal text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Edit2 size={16} />
            Edit My Profile
          </button>
        </div>
      </motion.div>

      {/* ── Followers / Following Modal ── */}
      <AnimatePresence>
        {followModal && (
          <>
            <motion.div
              key="follow-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[400]"
              onClick={() => setFollowModal(null)}
            />
            <motion.div
              key="follow-panel"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[401] w-full md:max-w-md bg-card border border-border rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <h3 className="font-display text-lg text-white capitalize">{followModal}</h3>
                  <span className="text-sm text-muted-foreground">
                    ({followModal === "followers" ? followCounts.followers : followCounts.following})
                  </span>
                </div>
                <button
                  onClick={() => setFollowModal(null)}
                  className="text-muted-foreground hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-1">
                {followListLoading ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[0.65rem] uppercase tracking-[3px] text-muted-foreground animate-pulse">Loading...</p>
                  </div>
                ) : followList.length === 0 ? (
                  <div className="flex flex-col items-center py-16 gap-3">
                    <Users size={36} className="text-muted-foreground/20" />
                    <p className="text-muted-foreground text-sm">
                      {followModal === "followers" ? "No followers yet." : "Not following anyone yet."}
                    </p>
                  </div>
                ) : (
                  followList.map((fp) => (
                    <div key={fp.user_id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 transition-colors">
                      <div className="w-11 h-11 rounded-full bg-secondary border border-border flex-shrink-0 overflow-hidden flex items-center justify-center font-display text-xl text-primary">
                        {fp.photo_url
                          ? <img src={fp.photo_url} alt={fp.name} className="w-full h-full object-cover" />
                          : (fp.name || "?")[0].toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-normal text-white truncate">{fp.name}</span>
                          {fp.plan === "pro" && <Crown size={12} className="text-amber-500 flex-shrink-0" />}
                        </div>
                        <span className="text-[0.6rem] uppercase tracking-[0.15em] text-primary/60">{fp.role}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </>
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
        <div>
          <h1 className="font-display text-4xl text-primary">Edit Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Update your professional casting profile</p>
        </div>
        <button
          onClick={handleCancelEdit}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-normal"
        >
          <X size={16} />
          Cancel
        </button>
      </div>

      <div className="space-y-6">
        {/* Profile Photo Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">Profile Photo</h3>
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
                <label
                  htmlFor="photo-upload-profile"
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-body font-normal text-xs cursor-pointer hover:opacity-90 transition-all shadow-md shadow-primary/10 inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Update Profile Photo
                </label>
                <p className="text-[0.7rem] text-muted-foreground max-w-[220px]">
                  Recommended: Square JPG or PNG, at least 400×400px. Max 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Photos Section ── */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40">Portfolio Photos</h3>
            <span className="text-[0.65rem] font-normal text-muted-foreground/50">
              {(profile as any)?.photos?.length || 0} / {profile?.plan === 'pro' ? '∞' : '3'}
            </span>
          </div>
          <p className="text-[0.68rem] text-muted-foreground/50 mb-4">
            {profile?.plan === 'pro' ? 'Unlimited photos (PRO)' : 'Free plan: up to 3 photos'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(profile as any)?.photos?.map((url: string, index: number) => (
              <div className="space-y-2 relative">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={url} alt={`Portfolio ${index}`} className="w-full h-full object-cover" />
                  <button
                    onClick={async () => {
                      if (!user) return;
                      const newPhotos = (profile as any).photos.filter((_: any, i: number) => i !== index);
                      const { error } = await supabase.from('profiles').update({ photos: newPhotos } as any).eq('user_id', user.id);
                      if (error) toast.error(error.message);
                      else { toast.success("Photo removed"); await refreshProfile(); }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <X size={14} />
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
                    className={`flex-1 text-[0.6rem] py-1 rounded-md border transition-all ${captions[url]?.is_premium ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-background border-border text-muted-foreground'}`}
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
              <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group">
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
            <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40">Video Reel</h3>
            <span className="text-[0.65rem] font-normal text-muted-foreground/50">
              {(profile as any)?.videos?.length || 0} / {profile?.plan === 'pro' ? '∞' : '1'}
            </span>
          </div>
          <p className="text-[0.68rem] text-muted-foreground/50 mb-4">
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
                  className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add video slot */}
          {(profile?.plan === 'pro' || ((profile as any)?.videos?.length || 0) < 1) ? (
            <label className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl px-5 py-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group w-full">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <div className="text-sm font-normal">Upload Video</div>
                <div className="text-[0.68rem] text-muted-foreground/60">MP4, MOV, WebM · Max 100MB</div>
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
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="FULL NAME" value={name} onChange={setName} />
            <Field label="PHONE (FOR SMS ALERTS)" value={phone} onChange={setPhone} placeholder="+977..." />
            <SelectField label="PRIMARY ROLE" value={role} onChange={setRole} options={ROLES} />
            <Field label="LOCATION" value={location} onChange={setLocation} placeholder="e.g. Mumbai, India" />
            <Field label="EMAIL (READ ONLY)" value={profile?.email || ""} onChange={() => { }} disabled />
          </div>
          <div className="mt-4">
            <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">BIO</label>
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
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-5 flex items-center justify-between">
            Smart Search Tags
            <Sparkles size={14} className="text-primary/40" />
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-[0.65rem] text-muted-foreground font-normal tracking-wider mb-2 uppercase">Moods</label>
              <div className="flex flex-wrap gap-1.5">
                {RECOMMENDED_TAGS.Moods.map(t => {
                  const isSelected = moodTags.includes(t.toLowerCase());
                  return (
                    <button
                      key={t}
                      onClick={() => setMoodTags(isSelected ? moodTags.filter(x => x !== t.toLowerCase()) : [...moodTags, t.toLowerCase()])}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] transition-all border ${isSelected ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[0.65rem] text-muted-foreground font-normal tracking-wider mb-2 uppercase">Styles</label>
              <div className="flex flex-wrap gap-1.5">
                {RECOMMENDED_TAGS.Styles.map(t => {
                  const isSelected = styleTags.includes(t.toLowerCase());
                  return (
                    <button
                      key={t}
                      onClick={() => setStyleTags(isSelected ? styleTags.filter(x => x !== t.toLowerCase()) : [...styleTags, t.toLowerCase()])}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] transition-all border ${isSelected ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[0.65rem] text-muted-foreground font-normal tracking-wider mb-2 uppercase">Personality</label>
              <div className="flex flex-wrap gap-1.5">
                {RECOMMENDED_TAGS.Personality.map(t => {
                  const isSelected = personalityTraits.includes(t.toLowerCase());
                  return (
                    <button
                      key={t}
                      onClick={() => setPersonalityTraits(isSelected ? personalityTraits.filter(x => x !== t.toLowerCase()) : [...personalityTraits, t.toLowerCase()])}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] transition-all border ${isSelected ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[0.65rem] text-muted-foreground font-normal tracking-wider mb-2 uppercase">Looks Like (Celebrity or Character Type)</label>
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
              <label className="block text-[0.65rem] text-muted-foreground font-normal tracking-wider mb-2 uppercase">Visual Search Keywords (Hidden from public)</label>
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
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">Physical Attributes</h3>
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
          <h3 className="text-[0.7rem] font-normal tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">Professional Experience</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="YEARS OF EXPERIENCE" value={experienceYears} onChange={setExperienceYears} type="number" />
            <Field label="PORTFOLIO / IMDB URL" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://..." />
          </div>

          <div>
            <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-2">SKILLS & SPECIALTIES</label>
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

            <div className="space-y-5 bg-secondary/20 p-5 rounded-2xl border border-border/50">
              <h4 className="text-[0.65rem] font-normal tracking-[2px] uppercase text-muted-foreground/60">Quick Add Skills</h4>
              {Object.entries(RECOMMENDED_SKILLS).map(([category, categorySkills]) => (
                <div key={category}>
                  <div className="text-[0.7rem] font-normal text-primary/80 mb-2 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categorySkills.map((s) => {
                      const isSelected = skills.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => isSelected ? removeSkill(s) : setSkills([...skills, s])}
                          className={`px-3 py-1.5 rounded-lg text-[0.68rem] font-medium transition-all border ${isSelected
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                            }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save / Cancel buttons */}
        <div className="flex items-center justify-between pt-4 pb-8 gap-4">
          <button
            onClick={handleCancelEdit}
            className="px-8 py-3 rounded-xl border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-all font-normal text-sm"
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
    <div className="bg-background/50 border border-border rounded-xl px-4 py-3 text-center">
      <div className="text-[0.6rem] font-normal tracking-[2px] uppercase text-muted-foreground/50 mb-1">{label}</div>
      <div className="text-sm font-normal text-foreground">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">{label}</label>
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
      <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">{label}</label>
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
