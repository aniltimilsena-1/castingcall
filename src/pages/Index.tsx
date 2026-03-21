import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
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
import PiPPlayer from "@/components/PiPPlayer";

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
  const [activeMessagePartnerId, setActiveMessagePartnerId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [projectFormInitiallyOpen, setProjectFormInitiallyOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSaved = async () => {
      try {
        const ids = await profileService.getSavedTalentIds(user.id);
        setSavedTalentIds(ids);
      } catch (err) {
        console.error("Failed to load saved talents");
      }
    };
    fetchSaved();

    // Global Presence Tracking
    const channel = supabase.channel('global-presence', {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(state).forEach(key => onlineIds.add(key));
        
        setOnlineUsers(prev => {
          if (prev.size === onlineIds.size && [...onlineIds].every(id => prev.has(id))) {
            return prev;
          }
          return onlineIds;
        });
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
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
        await profileService.unsaveTalent(user.id, profileId);
        setSavedTalentIds(prev => prev.filter(id => id !== profileId));
        toast.info("Talent removed from saved list");
      } else {
        await profileService.saveTalent(user.id, profileId);
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
    const profileId = p.id || p.user_id;
    routerNavigate(`/profile/${profileId}`);
  };

  const handleMessageClick = (userId: string) => {
    setActiveMessagePartnerId(userId);
    setPage("messages");
    routerNavigate("/messages");
  };

  const navigate = (p: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => {
    if (AUTH_REQUIRED.includes(p) && !user) {
      setPage("auth");
      routerNavigate("/auth");
      return;
    }

    if (options?.searchType) {
      setSearchInitialType(options.searchType);
    } else if (p === 'search') {
      // Default search type if not specified
      setSearchInitialType('talents');
    }

    if (options?.openForm) {
      setProjectFormInitiallyOpen(true);
    } else {
      setProjectFormInitiallyOpen(false);
    }

    setPage(p);

    // Sync URL - important for persistence on refresh
    if (p === "home") routerNavigate("/");
    else if (p === "auth") routerNavigate("/auth");
    else if (location.pathname.startsWith("/profile") && id === (user?.id || '')) {
       // Already on own profile path
    }
    else if (p === "profile" && user) routerNavigate(`/profile/${user.id}`);
    else if (p === "search") {
       // Support search params if needed
       routerNavigate("/search");
    }
    else routerNavigate(`/${p}`);
  };

  // Sync state with URL on load and path changes
  useEffect(() => {
    if (loading) return; 

    const path = location.pathname;
    const { page: pageParam } = (params as any);

    if (path === "/" || path === "") {
      setPage("home");
    } else if (path === "/auth") {
      if (user) navigate("home");
      else setPage("auth");
    } else if (path.startsWith("/profile")) {
      const profileId = id || path.split('/').pop();
      if (profileId && user && profileId === user.id) {
        setPage("profile");
      }
    } else {
      const p = (pageParam || path.substring(1).split('/')[0]) as PageName;
      if (p) {
        if (AUTH_REQUIRED.includes(p) && !user) {
          setPage("auth");
          routerNavigate("/auth", { replace: true });
        } else {
          setPage(p);
        }
      }
    }
    // Stabilized dependencies ensure this doesn't loop when user object refreshes in background.
  }, [location.pathname, user?.id, loading, id, routerNavigate]);

  // Handle viewing specific profiles via URL
  useEffect(() => {
    // Only fetch if we have an ID from URL and it's not the current user's profile
    // and we haven't already loaded this specific profile into the dialog.
    if (id && (!user || id !== user.id)) {
      if (selectedProfileForDialog?.user_id === id || selectedProfileForDialog?.id === id) return;

      const fetchProfile = async () => {
        try {
          const data = await profileService.getProfileById(id);
          if (data) {
            setSelectedProfileForDialog(data);
            setProfileDialogOpen(true);
          } else {
            toast.error("Profile not found");
            routerNavigate("/");
          }
        } catch (err) {
          toast.error("Profile not found");
          routerNavigate("/");
        }
      };
      fetchProfile();
    }
  }, [id, user?.id, routerNavigate]);

  const [searchInitialType, setSearchInitialType] = useState<"talents" | "projects">("talents");

  const handleSearch = (term: string, type: "talents" | "projects" = "talents") => {
    setSearchQuery(term);
    setSearchRole("");
    setSearchInitialType(type);
    navigate("search");
  };

  const handleCategoryClick = (role: string) => {
    if (role === 'all') {
      setSearchRole("");
      setSearchQuery("");
      setSearchInitialType("projects");
      navigate("search");
      return;
    }
    if (role === 'post') {
      navigate("projects", { openForm: true });
      return;
    }
    setSearchRole(role);
    setSearchQuery("");
    setSearchInitialType("talents");
    navigate("search");
  };

  const handleAuthClick = () => {
    if (user) {
      navigate("profile");
    } else {
      setPage("auth");
    }
  };

  // Only show the hard splash-screen on the very first boot.
  // After initialized becomes true, if loading flips back to true (e.g. background refresh),
  // we stay on the current page for a smoother experience.
  const [initialInitComplete, setInitialInitComplete] = useState(false);
  useEffect(() => {
    if (!loading) setInitialInitComplete(true);
  }, [loading]);

  if (loading && !initialInitComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-4xl text-primary animate-pulse">CaastingCall</div>
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
        onNotificationClick={() => navigate("notifications")}
        onMessagesClick={() => navigate("messages")}
        onNavigate={navigate}
        activePage={page}
        searchType={searchInitialType}
      />

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
      />

      <main className={`flex-1 ${page === 'feed' ? 'overflow-hidden' : 'overflow-y-auto'} pb-16 md:pb-0`}>
        {page === "home" && <HomePage onCategoryClick={handleCategoryClick} onProfileClick={handleProfileClick} onTermsClick={() => setPage("terms")} onNavigate={navigate} onlineUsers={onlineUsers} />}
        {page === "auth" && <AuthPage onSuccess={() => navigate("home")} />}
        {page === "profile" && <ProfilePage onBack={() => setPage("home")} />}
        {page === "search" && <SearchPage query={searchQuery} role={searchRole} initialType={searchInitialType} onTypeChange={setSearchInitialType} onBack={() => setPage("home")} onProfileClick={handleProfileClick} onlineUsers={onlineUsers} />}
        {page === "feed" && <FeedPage key={feedRefreshKey} onProfileClick={handleProfileClick} />}
        {page === "projects" && <MyProjectsPage initialOpenForm={projectFormInitiallyOpen} onProfileClick={handleProfileClick} onMessageClick={handleMessageClick} />}
        {page === "notifications" && <NotificationsPage onOpenPhoto={setViewingPhoto} />}
        {page === "messages" && <MessagesPage onNavigate={navigate} initialPartnerId={activeMessagePartnerId} />}
        {page === "settings" && <SettingsPage />}
        {page === "saved" && <SavedTalentsPage />}
        {page === "analytics" && <AnalyticsPage />}
        {page === "help" && <HelpSupportPage />}
        {page === "terms" && <TermsPrivacyPage />}
        {page === "premium" && <PremiumPage />}
        {page === "admin" && (
          currentUserProfile?.role === "Admin" 
            ? <AdminPage /> 
            : <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-background">
                <div className="text-center p-8 bg-card border border-border rounded-3xl max-w-sm">
                  <h2 className="text-xl font-display mb-2 text-foreground">Unauthorized</h2>
                  <p className="text-sm mb-6">You don't have permission to access the Command Center.</p>
                  <button onClick={() => navigate('home')} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest">Return Home</button>
                </div>
              </div>
        )}
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-[150] bg-card/95 backdrop-blur-xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-stretch h-16 rounded-2xl overflow-hidden pointer-events-auto" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: "home", label: "Home", icon: Home },
          { id: "feed", label: "Feed", icon: Sparkles },
          { id: "search", label: "Explore", icon: Search },
          { id: "profile", label: "Profile", icon: User },
        ] as { id: PageName; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${page === id ? "text-primary" : "text-muted-foreground"
              }`}
          >
            <div className={`relative flex items-center justify-center ${page === id ? "after:content-[''] after:absolute after:-bottom-1 after:w-1 after:h-1 after:bg-primary after:rounded-full" : ""}`}>
              <Icon size={20} strokeWidth={page === id ? 2.5 : 1.5} className="transition-all" />
            </div>
            <span className={`text-[0.6rem] transition-all font-medium uppercase tracking-[0.15em] ${page === id ? "opacity-100 scale-105" : "opacity-60"}`}>{label}</span>
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
        isSaved={selectedProfileForDialog ? savedTalentIds.includes(selectedProfileForDialog.id ?? selectedProfileForDialog.user_id) : false}
        onToggleSave={toggleSave}
        isOnline={selectedProfileForDialog ? onlineUsers.has(selectedProfileForDialog.user_id) : false}
        onDirectMessage={() => {
          if (selectedProfileForDialog?.user_id) {
            setProfileDialogOpen(false);
            handleMessageClick(selectedProfileForDialog.user_id);
          }
        }}
      />

      <PhotoViewer
        url={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        user={user}
        currentUserProfile={currentUserProfile}
      />
      <PiPPlayer />
    </div>
  );
};

export default Index;
