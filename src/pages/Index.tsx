import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import AppDrawer, { PageName } from "@/components/AppDrawer";
import HomePage from "@/components/HomePage";
import AuthPage from "@/components/AuthPage";
import ProfilePage from "@/components/ProfilePage";
import SearchPage, { PhotoViewer } from "@/components/SearchPage";
import MyProjectsPage from "@/components/MyProjectsPage";
import NotificationsPage from "@/components/NotificationsPage";
import MessagesPage from "@/components/MessagesPage";
import SettingsPage from "@/components/SettingsPage";
import SavedTalentsPage from "@/components/SavedTalentsPage";
import AnalyticsPage from "@/components/AnalyticsPage";
import HelpSupportPage from "@/components/HelpSupportPage";
import TermsPrivacyPage from "@/components/TermsPrivacyPage";
import PremiumPage from "@/components/PremiumPage";
import ProfileDetailDialog from "@/components/ProfileDetailDialog";

const AUTH_REQUIRED: PageName[] = ["profile", "projects", "notifications", "messages", "settings", "saved", "analytics"];

const Index = () => {
  const { user, profile: currentUserProfile, loading } = useAuth();
  const [page, setPage] = useState<PageName>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [selectedProfileForDialog, setSelectedProfileForDialog] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      const fetchSaved = async () => {
        const { data } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
        setSavedTalentIds(data?.map(s => s.talent_profile_id) || []);
      };
      fetchSaved();
    }
  }, [user]);

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
        await supabase.from("saved_talents").insert({ user_id: user.id, talent_profile_id: profileId });
        setSavedTalentIds(prev => [...prev, profileId]);
        toast.success("Talent saved successfully!");
      }
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const handleProfileClick = (p: any) => {
    setSelectedProfileForDialog(p);
    setProfileDialogOpen(true);
  };

  const navigate = (p: PageName) => {
    if (AUTH_REQUIRED.includes(p) && !user) {
      setPage("auth");
      return;
    }
    setPage(p);
  };

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    setSearchRole("");
    setPage("search");
  };

  const handleCategoryClick = (role: string) => {
    setSearchRole(role);
    setSearchQuery("");
    setPage("search");
  };

  const handleAuthClick = () => {
    if (user) {
      navigate("profile");
    } else {
      setPage("auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-4xl text-primary animate-pulse">CastingCall</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar
        onSearch={handleSearch}
        onAuthClick={handleAuthClick}
        onMenuClick={() => setDrawerOpen(true)}
        onLogoClick={() => setPage("home")}
        onPremiumClick={() => navigate("premium")}
      />

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
      />

      <main>
        {page === "home" && <HomePage onCategoryClick={handleCategoryClick} onProfileClick={handleProfileClick} />}
        {page === "auth" && <AuthPage onSuccess={() => setPage("home")} />}
        {page === "profile" && <ProfilePage onBack={() => setPage("home")} />}
        {page === "search" && <SearchPage query={searchQuery} role={searchRole} onBack={() => setPage("home")} onProfileClick={handleProfileClick} />}
        {page === "projects" && <MyProjectsPage />}
        {page === "notifications" && <NotificationsPage onOpenPhoto={setViewingPhoto} />}
        {page === "messages" && <MessagesPage onNavigate={navigate} />}
        {page === "settings" && <SettingsPage />}
        {page === "saved" && <SavedTalentsPage />}
        {page === "analytics" && <AnalyticsPage />}
        {page === "help" && <HelpSupportPage />}
        {page === "terms" && <TermsPrivacyPage />}
        {page === "premium" && <PremiumPage />}
      </main>

      <ProfileDetailDialog
        profile={selectedProfileForDialog}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
        currentUserProfile={currentUserProfile}
        isSaved={selectedProfileForDialog ? savedTalentIds.includes(selectedProfileForDialog.id) : false}
        onToggleSave={toggleSave}
      />

      <PhotoViewer
        url={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        user={user}
        currentUserProfile={currentUserProfile}
      />
    </div>
  );
};

export default Index;
