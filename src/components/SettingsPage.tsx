import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];

export default function SettingsPage() {
  const { user, profile, refreshProfile, isRecovering } = useAuth();
  const { confirm: confirmAction } = useConfirmation();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("Actor");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setRole(profile.role || "Actor");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ name, location, bio, role }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Settings saved!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isRecovering && !oldPassword) { toast.error("Please enter your current password"); return; }
    if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }

    try {
      setSaving(true);
      
      if (!isRecovering) {
        // Verify old password by attempting a silent sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || "",
          password: oldPassword,
        });

        if (signInError) {
          throw new Error("Incorrect current password. Please try again.");
        }
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="max-w-[680px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      {isRecovering && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 mb-8 text-center animate-pulse">
          <h2 className="text-primary font-display text-xl mb-1">Password Recovery Active</h2>
          <p className="text-xs text-primary/70">Please set a new password for your account below. No current password is required.</p>
        </div>
      )}
      <h1 className="font-accent text-3xl text-foreground mb-1">Settings</h1>
      <p className="text-muted-foreground text-sm mb-8">Manage your account preferences</p>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mb-6">
        <h3 className="font-accent text-[0.7rem] tracking-[1.5px] uppercase text-muted-foreground mb-5">Profile Photo</h3>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-secondary border-2 border-primary overflow-hidden flex-shrink-0 flex items-center justify-center font-display text-2xl text-primary">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (profile?.name || "?")[0].toUpperCase()
            )}
          </div>
          <div>
            <input
              type="file"
              id="settings-photo-upload"
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
            <label
              htmlFor="settings-photo-upload"
              className="bg-secondary text-primary px-4 py-2 rounded-lg font-body font-normal text-xs cursor-pointer hover:bg-secondary/80 transition-colors inline-block mb-2"
            >
              Update Photo
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
                className="ml-3 text-red-500 hover:text-red-600 transition-colors text-xs font-medium"
              >
                Remove
              </button>
            )}
            <p className="text-[0.7rem] text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mb-6 space-y-4">
        <h3 className="font-accent text-[0.7rem] tracking-[1.5px] uppercase text-muted-foreground mb-2">Account Details</h3>
        <div className="text-sm text-muted-foreground pb-2 border-b border-border">{user?.email}</div>
        <InputField label="DISPLAY NAME" value={name} onChange={setName} />
        <div>
          <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">ROLE</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <InputField label="LOCATION" value={location} onChange={setLocation} placeholder="e.g. Mumbai, India" />
        <div>
          <label className="block text-[0.76rem] text-muted-foreground font-normal tracking-wider mb-1">BIO</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Your bio…" className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors resize-y placeholder:text-muted-foreground/40" />
        </div>
        <button onClick={handleSaveProfile} disabled={saving} className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-body font-normal text-sm hover:opacity-85 transition-opacity disabled:opacity-50">
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mt-6 space-y-6">
        <h3 className="font-accent text-[0.7rem] tracking-[1.5px] uppercase text-muted-foreground mb-2">Display Preferences</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setTheme("light")}
            className={`flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-[1.5px] transition-all ${theme === 'light' ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
          >
            <Sun size={20} />
            <span className="text-[0.65rem] font-bold tracking-widest uppercase">Light</span>
          </button>
          
          <button
            onClick={() => setTheme("dark")}
            className={`flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-[1.5px] transition-all ${theme === 'dark' ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
          >
            <Moon size={20} />
            <span className="text-[0.65rem] font-bold tracking-widest uppercase">Dark</span>
          </button>

          <button
            onClick={() => setTheme("system")}
            className={`flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-[1.5px] transition-all ${theme === 'system' ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
          >
            <Laptop size={20} />
            <span className="text-[0.65rem] font-bold tracking-widest uppercase">Auto</span>
          </button>
        </div>
      </div>

      <div className="bg-card border-[1.5px] border-card-border rounded-2xl p-6 mt-6 space-y-4">
        <h3 className="font-accent text-[0.7rem] tracking-[1.5px] uppercase text-muted-foreground mb-2">Change Password</h3>
        {!isRecovering && (
          <InputField label="CURRENT PASSWORD" type="password" value={oldPassword} onChange={setOldPassword} placeholder="Enter your old password" />
        )}
        <InputField label="NEW PASSWORD" type="password" value={newPassword} onChange={setNewPassword} placeholder="Min 6 characters" />
        <button onClick={handleChangePassword} className="border-[1.5px] border-border text-foreground px-8 py-3 rounded-lg font-body font-normal text-sm hover:border-primary hover:text-primary transition-colors">
          Update Password
        </button>
      </div>
    </motion.div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block font-accent text-[0.72rem] text-muted-foreground tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-background border-[1.5px] border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40" />
    </div>
  );
}
