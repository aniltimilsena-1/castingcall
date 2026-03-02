import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Home, Sparkles, Search, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import AppDrawer, { PageName } from "@/components/AppDrawer";
import HomePage from "@/components/HomePage";
import AuthPage from "@/components/AuthPage";
import ProfilePage from "@/components/ProfilePage";
import SearchPage, { PhotoViewer } from "@/components/SearchPage";
import FeedPage from "@/components/FeedPage";
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

import AdminPage from "@/components/AdminPage";

const AUTH_REQUIRED: PageName[] = ["profile", "projects", "notifications", "messages", "settings", "saved", "analytics", "admin"];

const Index = () => {
  const { user, profile: currentUserProfile, loading } = useAuth();
  const params = useParams();
  const { id } = params;
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState<PageName>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [selectedProfileForDialog, setSelectedProfileForDialog] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

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
    routerNavigate(`/profile/${p.id}`);
  };

  const navigate = (p: PageName) => {
    if (AUTH_REQUIRED.includes(p) && !user) {
      setPage("auth");
      routerNavigate("/");
      return;
    }
    // Tapping Feed tab while already on feed → refresh
    if (p === "feed" && page === "feed") {
      setFeedRefreshKey(k => k + 1);
      return;
    }
    setPage(p);

    // Sync URL
    if (p === "home") routerNavigate("/");
    else if (p === "profile" && user) routerNavigate(`/profile/${user.id}`);
    else if (p === "auth") routerNavigate("/"); // Auth is usually a overlay or specific page, but here it's a "page state"
    else routerNavigate(`/${p}`);
  };

  // Sync state with URL on load and changes
  useEffect(() => {
    const path = location.pathname;
    const { page: pageParam } = (params as any);

    if (path === "/") {
      setPage("home");
    } else if (path.startsWith("/profile")) {
      if (id && (!user || id !== user.id)) {
        // Handled by other effect for third-party profile viewing
      } else {
        setPage("profile");
      }
    } else {
      // Use either the page param or the first part of the path
      const p = (pageParam || path.substring(1).split('/')[0]) as PageName;
      if (p) {
        if (AUTH_REQUIRED.includes(p) && !user && !loading) {
          setPage("auth");
          routerNavigate("/", { replace: true });
        } else {
          setPage(p);
        }
      }
    }
  }, [location.pathname, params, user, loading, id]);

  // Handle viewing specific profiles via URL
  useEffect(() => {
    if (id && (!user || id !== user.id)) {
      if (selectedProfileForDialog?.id === id) return; // Already loaded via handleProfileClick

      const fetchProfile = async () => {
        // Search by both id and user_id to be safe
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`id.eq.${id},user_id.eq.${id}`)
          .maybeSingle();

        if (data && !error) {
          setSelectedProfileForDialog(data);
          setProfileDialogOpen(true);
        } else {
          toast.error("Profile not found");
          routerNavigate("/");
        }
      };
      fetchProfile();
    }
  }, [id, user, selectedProfileForDialog]);

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    setSearchRole("");
    navigate("search");
  };

  const handleCategoryClick = (role: string) => {
    setSearchRole(role);
    setSearchQuery("");
    navigate("search");
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
    <div className="flex flex-col min-h-screen">
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

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {page === "home" && <HomePage onCategoryClick={handleCategoryClick} onProfileClick={handleProfileClick} onTermsClick={() => setPage("terms")} />}
        {page === "auth" && <AuthPage onSuccess={() => setPage("home")} />}
        {page === "profile" && <ProfilePage onBack={() => setPage("home")} />}
        {page === "search" && <SearchPage query={searchQuery} role={searchRole} onBack={() => setPage("home")} onProfileClick={handleProfileClick} />}
        {page === "feed" && <FeedPage key={feedRefreshKey} onProfileClick={handleProfileClick} />}
        {page === "projects" && <MyProjectsPage onProfileClick={handleProfileClick} />}
        {page === "notifications" && <NotificationsPage onOpenPhoto={setViewingPhoto} />}
        {page === "messages" && <MessagesPage onNavigate={navigate} />}
        {page === "settings" && <SettingsPage />}
        {page === "saved" && <SavedTalentsPage />}
        {page === "analytics" && <AnalyticsPage />}
        {page === "help" && <HelpSupportPage />}
        {page === "terms" && <TermsPrivacyPage />}
        {page === "premium" && <PremiumPage />}
        {page === "admin" && currentUserProfile?.role === "Admin" && <AdminPage />}
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[150] bg-card/95 backdrop-blur-md border-t border-border flex items-stretch h-16 safe-area-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: "home", label: "Home", icon: Home },
          { id: "feed", label: "Feed", icon: Sparkles },
          { id: "search", label: "Explore", icon: Search },
          { id: "profile", label: "Profile", icon: User },
        ] as { id: PageName; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${page === id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Icon size={22} strokeWidth={page === id ? 2.5 : 1.8} />
            <span className="text-[0.6rem] font-normal tracking-wider uppercase">{label}</span>
          </button>
        ))}
      </nav>

      <ProfileDetailDialog
        profile={selectedProfileForDialog}
        open={profileDialogOpen}
        onOpenChange={(open) => {
          setProfileDialogOpen(open);
          if (!open && id && (!user || id !== user.id)) {
            routerNavigate(-1); // Go back when closing the shareable profile link
          }
        }}
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
