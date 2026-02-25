import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { X, Plus, Crown } from "lucide-react";

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
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Actor");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // New Physical Fields
  const [height, setHeight] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [eyeColor, setEyeColor] = useState("");

  // New Professional Fields
  const [experienceYears, setExperienceYears] = useState<string>("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setRole(profile.role || "Actor");
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

      // Fetch captions
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
        name,
        role,
        location,
        bio,
        height,
        age: age ? parseInt(age) : null,
        gender,
        hair_color: hairColor,
        eye_color: eyeColor,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        portfolio_url: portfolioUrl,
        skills: skills
      };
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      // Save Captions
      const captionInserts = Object.entries(captions).map(([url, desc]) => ({
        photo_url: url,
        user_id: user.id,
        description: desc
      }));
      if (captionInserts.length > 0) {
        await supabase.from('photo_captions').upsert(captionInserts, { onConflict: 'photo_url' });
      }

      await refreshProfile();
      toast.success("Profile updated!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
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

  return (
    <motion.div
      className="max-w-[800px] mx-auto px-6 md:px-4 py-12"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-4xl text-primary">My Profile</h1>
            {profile?.plan === 'pro' && (
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 px-3 py-1 rounded-full text-[0.6rem] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
                <Crown size={12} strokeWidth={3} />
                PRO Member
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">Manage your professional casting profile</p>
        </div>
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold"
        >
          ← Back to home
        </button>
      </div>

      <div className="space-y-6">
        {/* Profile Photo Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-bold tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">
            Profile Photo
          </h3>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-full bg-secondary border-2 border-primary overflow-hidden flex-shrink-0 flex items-center justify-center font-display text-4xl text-primary shadow-lg shadow-primary/10">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (profile?.name || "?")[0].toUpperCase()
                )}
              </div>
              <div className="font-display text-lg text-white uppercase tracking-wider">{profile?.name}</div>
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
                    const { error: uploadError } = await supabase.storage
                      .from('avatars')
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('avatars')
                      .getPublicUrl(filePath);

                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ photo_url: publicUrl })
                      .eq('user_id', user.id);

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
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-body font-bold text-xs cursor-pointer hover:opacity-90 transition-all shadow-md shadow-primary/10 inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  Update Profile Photo
                </label>
                <p className="text-[0.7rem] text-muted-foreground max-w-[200px]">
                  Recommended: Square JPG or PNG, at least 400x400px. Max 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Photos Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-bold tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">
            Photos
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(profile as any)?.photos?.map((url: string, index: number) => (
              <div key={index} className="space-y-2">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={url} alt={`Portfolio ${index}`} className="w-full h-full object-cover" />
                  <button
                    onClick={async () => {
                      if (!user) return;
                      const newPhotos = (profile as any).photos.filter((_: any, i: number) => i !== index);
                      const { error } = await supabase
                        .from('profiles')
                        .update({ photos: newPhotos } as any)
                        .eq('user_id', user.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Photo removed");
                        await refreshProfile();
                      }
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

            <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group">
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="text-[0.65rem] font-bold uppercase tracking-wider">Add Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;
                  const fileExt = file.name.split('.').pop();
                  const filePath = `${user.id}/portfolio/${Math.random()}.${fileExt}`;

                  try {
                    toast.loading("Uploading to Photos...");
                    const { error: uploadError } = await supabase.storage
                      .from('avatars')
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('avatars')
                      .getPublicUrl(filePath);

                    const currentPhotos = (profile as any)?.photos || [];
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ photos: [...currentPhotos, publicUrl] } as any)
                      .eq('user_id', user.id);

                    if (updateError) throw updateError;
                    await refreshProfile();
                    toast.dismiss();
                    toast.success("Added to gallery!");
                  } catch (err: any) {
                    toast.dismiss();
                    toast.error(err.message || "Failed to upload photo");
                  }
                }}
              />
            </label>
          </div>
          <p className="text-[0.7rem] text-muted-foreground mt-4 italic">
            Add more photos to showcase your versatility and talent.
          </p>
        </div>

        {/* Basic Info Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-bold tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="FULL NAME" value={name} onChange={setName} />
            <SelectField label="PRIMARY ROLE" value={role} onChange={setRole} options={ROLES} />
            <Field label="LOCATION" value={location} onChange={setLocation} placeholder="e.g. Mumbai, India" />
            <Field label="EMAIL (READ ONLY)" value={profile?.email || ""} onChange={() => { }} disabled />
          </div>

          <div className="mt-4">
            <label className="block text-[0.76rem] text-muted-foreground font-bold tracking-wider mb-1">BIO</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Your professional summary..."
              className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors resize-y"
            />
          </div>
        </div>

        {/* Physical Attributes Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-bold tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">
            Physical Attributes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="HEIGHT" value={height} onChange={setHeight} placeholder="e.g. 5'10" />
            <Field label="AGE" value={age} onChange={setAge} type="number" placeholder="Years" />
            <SelectField label="GENDER" value={gender} onChange={setGender} options={GENDERS} />
            <SelectField label="HAIR COLOR" value={hairColor} onChange={setHairColor} options={COLORS} />
            <SelectField label="EYE COLOR" value={eyeColor} onChange={setEyeColor} options={COLORS} />
          </div>
        </div>

        {/* Professional Section */}
        <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6">
          <h3 className="text-[0.7rem] font-bold tracking-[1.5px] uppercase text-muted-foreground/40 mb-5">
            Professional Experience
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="YEARS OF EXPERIENCE" value={experienceYears} onChange={setExperienceYears} type="number" />
            <Field label="PORTFOLIO / IMDB URL" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://..." />
          </div>

          <div>
            <label className="block text-[0.76rem] text-muted-foreground font-bold tracking-wider mb-2">SKILLS & SPECIALTIES</label>

            <div className="flex flex-wrap gap-2 mb-6">
              {skills.map((skill) => (
                <span key={skill} className="bg-primary border border-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                  {skill}
                  <X size={14} className="cursor-pointer hover:text-white/70" onClick={() => removeSkill(skill)} />
                </span>
              ))}
            </div>

            <div className="flex gap-2 mb-8">
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
                className="bg-secondary text-primary px-4 py-2 rounded-lg font-bold text-xs hover:bg-secondary/80 border-[1.5px] border-border hover:border-primary/30 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-6 bg-secondary/20 p-6 rounded-2xl border border-border/50">
              <h4 className="text-[0.65rem] font-black tracking-[2px] uppercase text-muted-foreground/60 mb-2">Quick Add Skills</h4>
              {Object.entries(RECOMMENDED_SKILLS).map(([category, categorySkills]) => (
                <div key={category}>
                  <div className="text-[0.7rem] font-bold text-primary/80 mb-3 flex items-center gap-2">
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

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground rounded-lg px-12 py-3 font-body font-bold text-sm hover:opacity-85 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Complete Profile"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[0.76rem] text-muted-foreground font-bold tracking-wider mb-1">{label}</label>
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
      <label className="block text-[0.76rem] text-muted-foreground font-bold tracking-wider mb-1">{label}</label>
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
