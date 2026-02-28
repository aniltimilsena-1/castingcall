import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Crown, Edit2, MapPin, Briefcase, Link2, User, Camera } from "lucide-react";

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

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, profile, isPremium, refreshProfile } = useAuth();

  // Mode
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState("");
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
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Populate form fields whenever profile changes
  useEffect(() => {
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

      const fetchCaptions = async () => {
        const { data } = await supabase.from('photo_captions').select('photo_url, description').eq('user_id', profile.user_id);
        const caps: Record<string, string> = {};
        data?.forEach(c => caps[c.photo_url] = c.description || "");
        setCaptions(caps);
      };
      fetchCaptions();
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates = {
        name, role, location, bio, height,
        age: age ? parseInt(age) : null,
        gender,
        hair_color: hairColor,
        eye_color: eyeColor,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        portfolio_url: portfolioUrl,
        skills
      };
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
      if (error) throw error;

      const captionInserts = Object.entries(captions).map(([url, desc]) => ({
        photo_url: url, user_id: user.id, description: desc
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
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-primary hover:text-primary text-muted-foreground px-5 py-2.5 rounded-xl font-normal text-sm transition-all"
          >
            <Edit2 size={15} />
            Edit Profile
          </button>
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
            <div className="text-primary font-normal text-sm uppercase tracking-[2px] mb-4">{profile?.role || "Role not set"}</div>

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
              {profile.skills.map((skill) => (
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
              {(profile as any).photos.map((url: string, i: number) => (
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
              {(profile as any).videos.map((url: string, i: number) => (
                <video key={i} src={url} controls className="w-full rounded-xl border border-border bg-black" />
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
              <div key={index} className="space-y-2">
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
                </div>
                <input
                  type="text"
                  placeholder="Describe this photo..."
                  value={captions[url] || ""}
                  onChange={(e) => setCaptions({ ...captions, [url]: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-[0.7rem] outline-none focus:border-primary transition-colors"
                />
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
                      const { error: updateError } = await supabase.from('profiles').update({ photos: [...currentPhotos, publicUrl] } as any).eq('user_id', user.id);
                      if (updateError) throw updateError;
                      await refreshProfile();
                      toast.dismiss();
                      toast.success("Photo added!");
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
