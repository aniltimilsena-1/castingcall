import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { settingsService, UserSettings, DEFAULT_SETTINGS } from "@/services/settingsService";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, Eye, Bell, Globe, User, MessageSquare, Check, AlertCircle, Laptop, Sun, Moon } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { Language as LanguageType } from "@/translations";

const ROLES = ["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"];
const ROLE_TYPES = ["Commercials", "Feature Films", "Short Films", "Music Videos", "TV Series", "Theater", "Modeling"];

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
  const { t, setLanguage } = useTranslation();

  // Advanced Settings State
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setRole(profile.role || "Actor");
      
      // Load advanced settings
      if (user) {
        settingsService.getSettings(user.id).then(setSettings);
      }
    }
  }, [profile, user]);

  const updateSettingsField = async (updated: Partial<UserSettings>) => {
    if (!user || !settings) return;
    const newSettings = { ...settings, ...updated };
    setSettings(newSettings);
    
    // Sync language to context if changed
    if (updated.advanced?.language) {
      setLanguage(updated.advanced.language as LanguageType);
    }
    
    try {
      await settingsService.updateSettings(user.id, updated);
      toast.success("Preference updated");
    } catch (err) {
      console.error("Sync error detail:", err);
      toast.error(`Sync Issue: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

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

      toast.success(isRecovering ? "New password set successfully! 🎉" : "Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      if (isRecovering) {
        // Force refresh to clear recovery state after toast is visible
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="max-w-[720px] mx-auto px-4 py-12" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      {isRecovering && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 mb-8 text-center animate-pulse">
          <h2 className="text-primary font-display text-xl mb-1">Password Recovery Active</h2>
          <p className="text-xs text-primary/70">Please set a new password for your account below. No current password is required.</p>
        </div>
      )}

      <div className="mb-10 text-center md:text-left">
        <h1 className="font-accent text-4xl text-foreground mb-1 tracking-tight">{t('settings.title').split(' ')[0]} <span className="text-primary italic">{t('settings.title').split(' ')[1]}</span></h1>
        <p className="text-muted-foreground text-sm font-normal">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue={isRecovering ? "security" : "profile"} className="space-y-8">
        <TabsList className="bg-card border border-border p-1 rounded-2xl w-full grid grid-cols-4 h-auto overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="profile" className="rounded-xl py-3 text-[0.6rem] md:text-[0.65rem] uppercase tracking-widest font-bold flex gap-2">
            <User size={14} /> {t('settings.tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-xl py-3 text-[0.6rem] md:text-[0.65rem] uppercase tracking-widest font-bold flex gap-2">
            <Eye size={14} /> {t('settings.tabs.privacy')}
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl py-3 text-[0.6rem] md:text-[0.65rem] uppercase tracking-widest font-bold flex gap-2">
            <Shield size={14} /> {t('settings.tabs.security')}
          </TabsTrigger>
          <TabsTrigger value="comms" className="rounded-xl py-3 text-[0.6rem] md:text-[0.65rem] uppercase tracking-widest font-bold flex gap-2">
            <Bell size={14} /> {t('settings.tabs.comms')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="bg-card border-[1.5px] border-card-border rounded-3xl p-6 md:p-8 mb-6 shadow-sm">
            <h3 className="font-accent text-[0.7rem] tracking-[1.5px] uppercase text-muted-foreground mb-8 flex items-center gap-2">
              <Globe size={14} /> {t('settings.profile.identity')}
            </h3>
            
            <div className="flex flex-col md:flex-row gap-8 mb-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-secondary border-2 border-primary/20 p-1 relative group">
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-display text-2xl text-primary bg-secondary">
                    {profile?.photo_url ? (
                      <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      (profile?.name || "?")[0].toUpperCase()
                    )}
                  </div>
                  <input type="file" id="settings-photo-upload" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${user.id}/${Math.random()}.${fileExt}`;
                    try {
                      toast.loading("Uploading photo...");

                      // Remove old photo if exists
                      if (profile?.photo_url) {
                        try {
                          const parts = profile.photo_url.split('/');
                          const objectPath = parts.slice(parts.indexOf('avatars') + 1).join('/');
                          if (objectPath) {
                            await supabase.storage.from('avatars').remove([objectPath]);
                          }
                        } catch (e) { console.error("Old photo cleanup failed:", e); }
                      }

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
                  }} />
                </div>
                {profile?.photo_url && (
                  <button onClick={() => {
                    confirmAction({
                      title: "Remove Profile Photo",
                      description: "Are you sure you want to remove your profile photo?",
                      variant: "destructive",
                      confirmLabel: "Remove",
                      onConfirm: async () => {
                        if (!user) return;
                        try {
                          // Remove from storage first
                          if (profile?.photo_url) {
                            const parts = profile.photo_url.split('/');
                            const objectPath = parts.slice(parts.indexOf('avatars') + 1).join('/');
                            if (objectPath) {
                               await supabase.storage.from('avatars').remove([objectPath]);
                            }
                          }
                          const { error } = await supabase.from('profiles').update({ photo_url: null }).eq('user_id', user.id);
                          if (error) throw error;
                          await refreshProfile();
                          toast.success("Profile photo removed");
                        } catch (err: any) { toast.error(err.message || "Failed to remove photo"); }
                      }
                    });
                  }} className="text-red-500 hover:text-red-600 transition-colors text-[0.6rem] uppercase tracking-widest font-bold">
                    {t('settings.profile.remove')}
                  </button>
                )}
              </div>
              
              <div className="flex-1 space-y-5">
                <label htmlFor="settings-photo-upload" className="inline-block bg-primary/10 text-primary border border-primary/20 px-6 py-2.5 rounded-xl font-bold text-[0.65rem] uppercase tracking-widest cursor-pointer hover:bg-primary/20 transition-all mb-4">
                  {t('settings.profile.upload')}
                </label>
                <InputField label={t('settings.profile.displayName')} value={name} onChange={setName} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase mb-1.5 ml-1">{t('settings.profile.role')}</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-body text-sm outline-none focus:border-primary transition-colors appearance-none cursor-pointer">
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <InputField label={t('settings.profile.location')} value={location} onChange={setLocation} placeholder="City, Country" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase mb-1.5 ml-1">{t('settings.profile.bio')}</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Your career summary..." className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground/30" />
              </div>

              {settings && (
                <div className="pt-6 border-t border-border space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground mb-0.5">{t('settings.profile.availability')}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{t('settings.profile.availabilitySubtitle')}</p>
                    </div>
                    <select 
                      value={settings.availability} 
                      onChange={(e) => updateSettingsField({ availability: e.target.value as any })}
                      className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-primary font-bold uppercase tracking-wider outline-none"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Open to offers">Open to offers</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <p className="text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase">{t('settings.profile.willingness')}</p>
                      <div className="space-y-4">
                        <ToggleItem 
                          label="Open to Travel" 
                          enabled={settings.willingness.travel} 
                          onToggle={() => updateSettingsField({ willingness: { ...settings.willingness, travel: !settings.willingness.travel } })}
                        />
                        <ToggleItem 
                          label="Paid Work Required" 
                          enabled={settings.willingness.paidWork} 
                          onToggle={() => updateSettingsField({ willingness: { ...settings.willingness, paidWork: !settings.willingness.paidWork } })}
                        />
                        <ToggleItem 
                          label="Collaboration Open" 
                          enabled={settings.advanced.openToCollaboration} 
                          onToggle={() => updateSettingsField({ advanced: { ...settings.advanced, openToCollaboration: !settings.advanced.openToCollaboration } })}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase mb-3">{t('settings.profile.preferredRoles')}</p>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_TYPES.map(rt => {
                          const isSelected = settings.willingness.roles.includes(rt);
                          return (
                            <button 
                              key={rt}
                              onClick={() => {
                                const newRoles = isSelected 
                                  ? settings.willingness.roles.filter(r => r !== rt)
                                  : [...settings.willingness.roles, rt];
                                updateSettingsField({ willingness: { ...settings.willingness, roles: newRoles } });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[0.6rem] font-bold transition-all border ${isSelected ? 'bg-primary/20 border-primary text-primary' : 'bg-secondary/50 border-border text-muted-foreground hover:border-primary/40'}`}
                            >
                              {rt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-[0.7rem] uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 mt-4">
                {saving ? t('settings.profile.processing') : t('settings.profile.updateBtn')}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <div className="bg-card border border-card-border rounded-3xl p-6 md:p-8 space-y-10">
            {settings && (
              <>
                <div className="space-y-6">
                  <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-6 flex items-center gap-2">
                    <Eye size={16} /> Visibility Controls
                  </h3>
                  
                  <div className="space-y-8">
                    <LargeToggle 
                      title="Public Profile" 
                      description="Make your portfolio visible to everyone on the platform." 
                      enabled={settings.isPublic} 
                      onToggle={() => updateSettingsField({ isPublic: !settings.isPublic })} 
                    />
                    <LargeToggle 
                      title="Search Visibility" 
                      description="Appear in casting directors' and producers' search results." 
                      enabled={settings.isSearchable} 
                      onToggle={() => updateSettingsField({ isSearchable: !settings.isSearchable })} 
                    />
                    <LargeToggle 
                      title="Online Status" 
                      description="Show others when you are actively using the platform." 
                      enabled={settings.visibility.onlineStatus} 
                      onToggle={() => updateSettingsField({ visibility: { ...settings.visibility, onlineStatus: !settings.visibility.onlineStatus } })} 
                    />
                    <LargeToggle 
                      title="Read Receipts" 
                      description="Let others know when you've read their messages." 
                      enabled={settings.visibility.readReceipts} 
                      onToggle={() => updateSettingsField({ visibility: { ...settings.visibility, readReceipts: !settings.visibility.readReceipts } })} 
                    />
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-border">
                  <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-6 flex items-center gap-2">
                    <Shield size={16} /> {t('settings.privacy.permissions')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground">{t('settings.privacy.whoSee')}</p>
                      <select 
                        value={settings.visibility.profile} 
                        onChange={(e) => updateSettingsField({ visibility: { ...settings.visibility, profile: e.target.value as any } })}
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                      >
                        <option value="Everyone">Everyone</option>
                        <option value="Verified">Verified Users Only</option>
                        <option value="No one">Private (No one)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground">{t('settings.privacy.whoMessage')}</p>
                      <select 
                        value={settings.visibility.messaging} 
                        onChange={(e) => updateSettingsField({ visibility: { ...settings.visibility, messaging: e.target.value as any } })}
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                      >
                        <option value="Everyone">Everyone</option>
                        <option value="Verified">Verified Users Only</option>
                        <option value="No one">No one</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground">Show Connection Lists?</p>
                      <select 
                        value={settings.visibility.showConnections} 
                        onChange={(e) => updateSettingsField({ visibility: { ...settings.visibility, showConnections: e.target.value as any } })}
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                      >
                        <option value="Everyone">Everyone</option>
                        <option value="Followers">Followers Only</option>
                        <option value="No one">No one (Private)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ToggleItem 
                      label={t('settings.privacy.showContact')} 
                      enabled={settings.visibility.showContactOnlyOnAccepted} 
                      onToggle={() => updateSettingsField({ visibility: { ...settings.visibility, showContactOnlyOnAccepted: !settings.visibility.showContactOnlyOnAccepted } })}
                    />
                    <ToggleItem 
                      label="Show Social Media Links" 
                      enabled={settings.visibility.showSocialLinks} 
                      onToggle={() => updateSettingsField({ visibility: { ...settings.visibility, showSocialLinks: !settings.visibility.showSocialLinks } })}
                    />
                    <ToggleItem 
                      label="Show Profile View Statistics" 
                      enabled={settings.visibility.showStats} 
                      onToggle={() => updateSettingsField({ visibility: { ...settings.visibility, showStats: !settings.visibility.showStats } })}
                    />
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-border">
                  <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-6 flex items-center gap-2">
                    <Lock size={16} /> {t('settings.privacy.protection.title')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <LargeToggle 
                      title={t('settings.privacy.protection.watermark')} 
                      description={t('settings.privacy.protection.watermarkDesc')} 
                      enabled={settings.protection.watermark} 
                      onToggle={() => updateSettingsField({ protection: { ...settings.protection, watermark: !settings.protection.watermark } })} 
                    />
                    <LargeToggle 
                      title={t('settings.privacy.protection.preventDownload')} 
                      description={t('settings.privacy.protection.preventDownloadDesc')} 
                      enabled={settings.protection.preventDownload} 
                      onToggle={() => updateSettingsField({ protection: { ...settings.protection, preventDownload: !settings.protection.preventDownload } })} 
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="bg-card border border-card-border rounded-3xl p-6 md:p-8 space-y-10">
            <div className="space-y-6">
              <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-2">Access Credentials</h3>
              {!isRecovering && (
                <InputField label={t('settings.security.currentPass')} type="password" value={oldPassword} onChange={setOldPassword} placeholder="Verification required" />
              )}
              <InputField label={t('settings.security.newPass')} type="password" value={newPassword} onChange={setNewPassword} placeholder="Secured (Min 6 chars)" />
              <button onClick={handleChangePassword} className="bg-foreground text-background px-8 py-3 rounded-xl font-bold text-[0.65rem] uppercase tracking-widest hover:opacity-90 transition-all">
                {t('settings.security.updatePass')}
              </button>
            </div>

            <div className="space-y-6 pt-10 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">Two-Factor Authentication (2FA)</h3>
                  <p className="text-[0.65rem] text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <button 
                  onClick={() => toast.info("MFA setup is available in Pro plan or via secure email link.")}
                  className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-[0.6rem] font-bold uppercase tracking-widest"
                >
                  Configure
                </button>
              </div>
            </div>

            <div className="space-y-6 pt-10 border-t border-border">
              <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-4">Device Sessions</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-4">
                    <Laptop size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Current Session · Active Location</p>
                      <p className="text-[0.6rem] text-muted-foreground">Application · Active Now</p>
                    </div>
                  </div>
                  <span className="text-[0.5rem] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Current</span>
                </div>
                
                <button 
                  onClick={() => {
                    confirmAction({
                      title: "Log out of all devices",
                      description: "This will terminate all active sessions except your current one.",
                      onConfirm: async () => {
                        const { error } = await supabase.auth.signOut({ scope: 'others' });
                        if (error) toast.error(error.message);
                        else toast.success("All other sessions terminated");
                      }
                    });
                  }}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-2"
                >
                  <AlertCircle size={14} /> {t('settings.security.logoutOthers')}
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comms" className="space-y-6">
          <div className="bg-card border border-card-border rounded-3xl p-6 md:p-8 space-y-10">
            {settings && (
              <>
                <div className="space-y-6">
                  <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-2">{t('settings.comms.engagement')}</h3>
                  <div>
                    <label className="block text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase mb-2 ml-1">{t('settings.comms.autoResponse')}</label>
                    <textarea 
                      value={settings.communication.autoResponse} 
                      onChange={(e) => updateSettingsField({ communication: { ...settings.communication, autoResponse: e.target.value } })}
                      rows={3} 
                      placeholder="Hi! Thanks for reaching out. I'll get back to you soon..." 
                      className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground/30" 
                    />
                  </div>
                  <ToggleItem 
                    label={t('settings.comms.emailNotif')} 
                    enabled={settings.communication.emailNotifications} 
                    onToggle={() => updateSettingsField({ communication: { ...settings.communication, emailNotifications: !settings.communication.emailNotifications } })}
                  />
                </div>

                <div className="space-y-6 pt-10 border-t border-border">
                  <h3 className="text-[0.7rem] font-bold tracking-[2px] uppercase text-primary/70 mb-4">{t('settings.comms.preferences')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase mb-2 ml-1">{t('settings.comms.language')}</label>
                      <select 
                        value={settings.advanced.language} 
                        onChange={(e) => updateSettingsField({ advanced: { ...settings.advanced, language: e.target.value } })}
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-xs font-medium outline-none"
                      >
                        <option value="English">English (US)</option>
                        <option value="Hindi">Hindi / हिन्दी</option>
                        <option value="Nepali">Nepali / नेपाली</option>
                        <option value="Spanish">Spanish / Español</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <p className="text-[0.6rem] text-muted-foreground mb-1 px-1">{t('settings.comms.theme')}</p>
                      <div className="flex gap-2">
                        {['light', 'dark', 'system'].map(t => (
                          <button 
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`flex-1 py-1.5 rounded-lg border text-[0.55rem] font-bold uppercase tracking-tighter transition-all ${theme === t ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary/20 border-border text-muted-foreground'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="pt-10 border-t border-border">
               <button 
                onClick={() => {
                  confirmAction({
                    title: "Block User Management",
                    description: "View and manage your blocked users list.",
                    onConfirm: () => toast.info("Block list feature loading...")
                  });
                }}
                className="flex items-center gap-3 text-red-500 text-[0.65rem] font-bold uppercase tracking-widest hover:opacity-80 transition-all border border-red-500/20 px-4 py-2 rounded-xl bg-red-500/5 group"
              >
                <AlertCircle size={14} className="group-hover:rotate-12 transition-transform" /> {t('privacy.visibility').includes('.') ? t('privacy.visibility') : "Manage Blocked Accounts"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
    </motion.div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="w-full">
      <label className="block text-[0.65rem] text-muted-foreground font-bold tracking-[1.5px] uppercase mb-1.5 ml-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-body text-sm outline-none focus:border-primary transition-all placeholder:text-muted-foreground/30 shadow-sm" />
    </div>
  );
}

function ToggleItem({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

function LargeToggle({ title, description, enabled, onToggle }: { title: string; description: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-secondary/10 border border-border/40 hover:border-primary/20 transition-all group">
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
        <p className="text-[0.65rem] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}
