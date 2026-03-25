import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Home, 
  Sparkles, 
  Search, 
  User, 
  Video, 
  Phone, 
  PhoneOff, 
  VideoOff, 
  X 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WebRTCCall from "@/components/WebRTCCall";
import { useTranslation } from "@/contexts/LanguageContext";
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
  const { t } = useTranslation();
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
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const lastHomeClickRef = useRef<number>(0);
  
  // Audio/Video Call Global State
  const [incomingCall, setIncomingCall] = useState<{ roomId: string, callerName: string, type: 'video' | 'audio', callerId: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ roomId: string, type: 'video' | 'audio', partnerId?: string, isCaller?: boolean, isAccepted?: boolean, callerName?: string } | null>(null);
  const globalPresenceChannelRef = useRef<any>(null);

  const incomingCallRef = useRef(incomingCall);
  const activeCallRef = useRef(activeCall);
  const callTimeoutRef = useRef<any>(null);
  const currentUserNameRef = useRef(currentUserProfile?.name);
  const dialToneRef = useRef<HTMLAudioElement | null>(null);
  const ringToneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { currentUserNameRef.current = currentUserProfile?.name; }, [currentUserProfile?.name]);
  
  // Call Sound Effects Logic
  useEffect(() => {
    if (!dialToneRef.current) dialToneRef.current = new Audio("https://www.soundjay.com/phone/phone-ringing-01.wav");
    if (!ringToneRef.current) ringToneRef.current = new Audio("https://www.soundjay.com/phone/telephone-ring-03a.wav");
    
    dialToneRef.current.loop = true;
    ringToneRef.current.loop = true;

    // Handle Dial Tone (Caller)
    if (activeCall && activeCall.isCaller && !activeCall.isAccepted) {
      dialToneRef.current.play().catch(e => console.warn("Audio play blocked", e));
    } else {
      dialToneRef.current.pause();
      dialToneRef.current.currentTime = 0;
    }

    // Handle Ring Tone (Recipient)
    if (incomingCall) {
      ringToneRef.current.play().catch(e => console.warn("Audio play blocked", e));
    } else {
      ringToneRef.current.pause();
      ringToneRef.current.currentTime = 0;
    }

    return () => {
      dialToneRef.current?.pause();
      ringToneRef.current?.pause();
    };
  }, [activeCall?.isAccepted, activeCall?.isCaller, incomingCall]);

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

    // Global Presence & Signaling Tracking
    console.log("Subscribing to global-signaling for user:", user.id);
    const channel = supabase.channel('global-presence', {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(state).forEach(key => onlineIds.add(key));
        setOnlineUsers(onlineIds);
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
      .on('broadcast', { event: 'call_signal' }, (payload) => {
        const data = payload.payload;
        console.log("Global received call_signal:", data.action, "from", data.callerName);
        
        if (data.targetId === user.id) {
          const currentActive = activeCallRef.current;
          const currentIncoming = incomingCallRef.current;

          if (data.action === 'call') {
            if (currentActive || currentIncoming) return; 
            setIncomingCall({ roomId: data.roomId, callerName: data.callerName, type: data.type, callerId: data.callerId });
          } else if (data.action === 'accept') {
            if (currentActive && currentActive.partnerId === data.callerId) {
              setActiveCall({ roomId: data.roomId, type: data.type, partnerId: data.callerId, isCaller: currentActive.isCaller, isAccepted: true });
            }
          } else if (data.action === 'decline' || data.action === 'end') {
            if (currentIncoming && currentIncoming.callerId === data.callerId) setIncomingCall(null);
            if (currentActive && currentActive.partnerId === data.callerId) setActiveCall(null);
          }
        }
      })
      .subscribe(async (status) => {
        console.log("Global signal sub status:", status);
        if (status === 'SUBSCRIBED') {
          globalPresenceChannelRef.current = channel;
          await channel.track({ online_at: new Date().toISOString(), name: currentUserNameRef.current });
        }
      });

    return () => {
      globalPresenceChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const startCall = async (targetId: string, partnerName: string, type: 'video' | 'audio') => {
    if (!user || activeCallRef.current || incomingCallRef.current || !globalPresenceChannelRef.current) return;
    
    const roomId = `cc-${user.id}-${targetId}-${Date.now()}`;
    setActiveCall({ roomId, type, partnerId: targetId, isCaller: true, isAccepted: false, callerName: partnerName });
    
    // Start unanswered call timeout (30 seconds)
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = setTimeout(() => {
      if (activeCallRef.current && !activeCallRef.current.isAccepted) {
        toast.info("Call unanswered");
        endCall();
      }
    }, 30000);

    try {
      await globalPresenceChannelRef.current.send({
        type: 'broadcast',
        event: 'call_signal',
        payload: {
          targetId,
          callerId: user.id,
          callerName: currentUserNameRef.current || 'User',
          roomId,
          type,
          action: 'call'
        }
      });
    } catch (err) {
      console.error("Failed to send call signal:", err);
      toast.error("Could not initiate call. Please try again.");
      setActiveCall(null);
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !user || !globalPresenceChannelRef.current) return;
    
    await globalPresenceChannelRef.current.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: {
        targetId: incomingCall.callerId,
        callerId: user.id,
        roomId: incomingCall.roomId,
        type: incomingCall.type,
        action: 'accept'
      }
    });
    setActiveCall({ roomId: incomingCall.roomId, type: incomingCall.type, partnerId: incomingCall.callerId, isCaller: false, isAccepted: true, callerName: incomingCall.callerName });
    setIncomingCall(null);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
  };

  const rejectCall = async () => {
    if (!incomingCall || !user || !globalPresenceChannelRef.current) return;
    await globalPresenceChannelRef.current.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: { targetId: incomingCall.callerId, callerId: user.id, action: 'decline' }
    });
    setIncomingCall(null);
  };

  const endCall = async () => {
    if (!activeCall || !user || !globalPresenceChannelRef.current) {
        if (activeCall) setActiveCall(null);
        return;
    }
    if (activeCall.partnerId) {
      try {
        await globalPresenceChannelRef.current.send({
          type: 'broadcast',
          event: 'call_signal',
          payload: { targetId: activeCall.partnerId, callerId: user.id, action: 'end' }
        });
      } catch (e) {
        console.error("Failed to send end call signal:", e);
      }
    }
    setActiveCall(null);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
  };

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
            // EXCLUDE ADMIN PROFILES FROM PUBLIC VIEW
            if (data.role === 'Admin' && currentUserProfile?.role !== 'Admin' && data.user_id !== user?.id) {
                toast.error("This profile is private");
                routerNavigate("/");
                return;
            }
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
      {page !== 'messages' && page !== 'feed' && (
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
      )}

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
      />

      <main className={`flex-1 ${page === 'feed' ? 'overflow-hidden' : 'overflow-y-auto'} ${page === 'messages' ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        {page === "home" && <HomePage key={homeRefreshKey} onCategoryClick={handleCategoryClick} onProfileClick={handleProfileClick} onTermsClick={() => setPage("terms")} onNavigate={navigate} onlineUsers={onlineUsers} />}
        {page === "auth" && <AuthPage onSuccess={() => navigate("home")} />}
        {page === "profile" && <ProfilePage onBack={() => setPage("home")} />}
        {page === "search" && <SearchPage query={searchQuery} role={searchRole} initialType={searchInitialType} onTypeChange={setSearchInitialType} onBack={() => setPage("home")} onProfileClick={handleProfileClick} onlineUsers={onlineUsers} />}
        {page === "feed" && <FeedPage key={feedRefreshKey} onProfileClick={handleProfileClick} onBack={() => navigate("home")} />}
        {page === "projects" && <MyProjectsPage initialOpenForm={projectFormInitiallyOpen} onProfileClick={handleProfileClick} onMessageClick={handleMessageClick} />}
        {page === "notifications" && <NotificationsPage onOpenPhoto={setViewingPhoto} />}
        {page === "messages" && (
          <MessagesPage 
            onNavigate={navigate} 
            initialPartnerId={activeMessagePartnerId} 
            onlineUsers={onlineUsers}
            incomingCall={incomingCall}
            activeCall={activeCall}
            onStartCall={startCall}
            onEndCall={endCall}
          />
        )}
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
      {page !== 'messages' && page !== 'feed' && (
        <nav className="md:hidden fixed bottom-6 inset-x-6 z-[150] glass border border-foreground/5 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-stretch h-20 rounded-[2.5rem] overflow-hidden pointer-events-auto transition-all" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          {([
            { id: "home", label: t('nav.home'), icon: Home },
            { id: "feed", label: t('nav.feed'), icon: Sparkles },
            { id: "search", label: t('nav.search'), icon: Search },
            { id: "profile", label: t('nav.profile'), icon: User },
          ] as { id: PageName; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90 ${page === id ? "text-primary" : "text-muted-foreground/70"
                }`}
            >
              <div className={`relative flex items-center justify-center ${page === id ? "after:content-[''] after:absolute after:-bottom-2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full after:gold-glow" : ""}`}>
                <Icon size={24} strokeWidth={page === id ? 2.5 : 1.5} className="transition-all" />
              </div>
              <span className={`text-[0.55rem] transition-all font-black uppercase tracking-[0.2em] ${page === id ? "opacity-100 scale-105" : ""}`}>{label}</span>
            </button>
          ))}
        </nav>
      )}

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

      {/* Global Real-time WebRTC Signaling UI Overlay */}
      {activeCall && activeCall.partnerId && user && (
        <div className="fixed inset-0 z-[450]">
          <WebRTCCall
            isCaller={!!activeCall.isCaller}
            isAccepted={!!activeCall.isAccepted}
            roomId={activeCall.roomId}
            targetId={activeCall.partnerId}
            currentUserId={user.id}
            partnerName={activeCall.callerName || 'User'}
            callType={activeCall.type}
            onEndCall={endCall}
          />
        </div>
      )}

      {/* Global Incoming Call Alert */}
      <AnimatePresence>
        {incomingCall && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
            <motion.div 
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="bg-[#2a2a2a] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] backdrop-blur-xl"
            >
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite] border-4 border-primary/30">
                    {incomingCall.type === 'video' ? <Video size={36} className="text-primary animate-bounce text-yellow-400" /> : <Phone size={36} className="text-primary animate-bounce text-yellow-400" />}
                </div>
                <div className="text-center">
                    <h3 className="text-xl text-white font-medium mb-1">{incomingCall.callerName}</h3>
                    <p className="text-[10px] text-primary uppercase tracking-[0.3em] font-black">{incomingCall.type} Call...</p>
                </div>
                <div className="flex items-center gap-4 w-full mt-2">
                    <button 
                      onClick={rejectCall}
                      className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-500/30 transition-colors flex justify-center items-center gap-2"
                     >
                      <PhoneOff size={14} /> Decline
                    </button>
                    <button 
                      onClick={answerCall}
                      className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                     >
                      {incomingCall.type === 'video' ? <Video size={14} /> : <Phone size={14} />} Accept
                    </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
