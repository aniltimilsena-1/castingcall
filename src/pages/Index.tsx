import { useEffect, useState, useRef, lazy, Suspense, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateSmartMatch, getMatchBadgeStyle } from "@/utils/smartMatch";
import { 
  Home, 
  Sparkles, 
  Search, 
  User, 
  Video, 
  Phone, 
  PhoneOff, 
  VideoOff, 
  X,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import Navbar from "@/components/Navbar";
import AppDrawer, { PageName } from "@/components/AppDrawer";
import PullToRefresh from "@/components/PullToRefresh";

// ── Lazy-loaded page components (code-splitting) ──
// Each page loads its own JS chunk only when the user navigates to it
const HomePage = lazy(() => import("@/components/HomePage"));
const AuthPage = lazy(() => import("@/components/AuthPage"));
const ProfilePage = lazy(() => import("@/components/ProfilePage"));
const SearchPage = lazy(() => import("@/components/SearchPage"));
const FeedPage = lazy(() => import("@/components/FeedPage"));
const MyProjectsPage = lazy(() => import("@/components/MyProjectsPage"));
const NotificationsPage = lazy(() => import("@/components/NotificationsPage"));
const MessagesPage = lazy(() => import("@/components/MessagesPage"));
const SettingsPage = lazy(() => import("@/components/SettingsPage"));
const SavedItemsPage = lazy(() => import("@/components/SavedItemsPage"));
const AnalyticsPage = lazy(() => import("@/components/AnalyticsPage"));
const HelpSupportPage = lazy(() => import("@/components/HelpSupportPage"));
const TermsPrivacyPage = lazy(() => import("@/components/TermsPrivacyPage"));
const PremiumPage = lazy(() => import("@/components/PremiumPage"));
const AdminPage = lazy(() => import("@/components/AdminPage"));
const WebRTCCall = lazy(() => import("@/components/WebRTCCall"));
const ProfileDetailDialog = lazy(() => import("@/components/ProfileDetailDialog"));
const PiPPlayer = lazy(() => import("@/components/PiPPlayer"));
const CommandCenter = lazy(() => import("@/components/CommandCenter"));
const CastingTape = lazy(() => import("@/components/CastingTape"));

// Lightweight loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold">Loading</span>
    </div>
  </div>
);

// PhotoViewer is a lightweight overlay, keep it lazy
const PhotoViewerLazy = lazy(() => import("@/components/SearchPage").then(mod => ({ default: mod.PhotoViewer })));

const AUTH_REQUIRED: PageName[] = ["profile", "projects", "notifications", "messages", "settings", "saved", "analytics", "admin"];

const Index = () => {
  const { user, profile: currentUserProfile, loading } = useAuth();
  const { t } = useTranslation();
  const params = useParams();
  const { id } = params;
  const routerNavigate = useNavigate();
  const location = useLocation();

  // Derived page state from URL params
  const { page: pageParam } = params;
  const page: PageName = (pageParam === "auth" || location.pathname === "/auth" || pageParam === "login" || pageParam === "signup") ? "auth" : 
                         (location.pathname === "/" || location.pathname === "") ? "home" :
                         (location.pathname === "/search") ? "search" :
                         (location.pathname === "/feed") ? "feed" :
                         (location.pathname === "/projects") ? "projects" :
                         (location.pathname === "/messages") ? "messages" :
                         (location.pathname === "/notifications") ? "notifications" :
                         (location.pathname === "/settings") ? "settings" :
                         (location.pathname === "/saved") ? "saved" :
                         (location.pathname === "/analytics") ? "analytics" :
                         (location.pathname === "/help") ? "help" :
                         (location.pathname === "/terms") ? "terms" :
                         (location.pathname === "/premium") ? "premium" :
                         (location.pathname === "/admin") ? "admin" :
                         (location.pathname.startsWith("/profile")) ? "profile" :
                         (pageParam as PageName) || "home";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [selectedProfileForDialog, setSelectedProfileForDialog] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [activeMessagePartnerId, setActiveMessagePartnerId] = useState<string | null>(null);
  const activeMessagePartnerIdRef = useRef<string | null>(null);
  useEffect(() => { activeMessagePartnerIdRef.current = activeMessagePartnerId; }, [activeMessagePartnerId]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [projectFormInitiallyOpen, setProjectFormInitiallyOpen] = useState(false);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const isAppInBackgroundRef = useRef(false);
  const lastHomeClickRef = useRef<number>(0);

  // CMD+K Command Center
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [castingTapeOpen, setCastingTapeOpen] = useState(false);

  // Spotlight cursor position
  const [spotlightPos, setSpotlightPos] = useState({ x: -9999, y: -9999 });
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  
  // Audio/Video Call Global State
  const [incomingCall, setIncomingCall] = useState<{ roomId: string, callerName: string, type: 'video' | 'audio', callerId: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ roomId: string, type: 'video' | 'audio', partnerId?: string, isCaller?: boolean, isAccepted?: boolean, callerName?: string, startTime?: number } | null>(null);
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
    if (!dialToneRef.current) {
      // Modern digital dial tone/outgoing ring
      dialToneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3");
      dialToneRef.current.loop = true;
      dialToneRef.current.volume = 0;
    }
    if (!ringToneRef.current) {
      // Melodic modern ringtone for incoming calls
      ringToneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      ringToneRef.current.loop = true;
      ringToneRef.current.volume = 0;
    }
    
    // Handle Dial Tone (Caller)
    if (activeCall && activeCall.isCaller && !activeCall.isAccepted) {
      dialToneRef.current.muted = false;
      dialToneRef.current.volume = 1.0;
      dialToneRef.current.play().catch(e => {
        console.warn("Audio play blocked for dial tone. Waiting for user interaction.", e);
      });
    } else {
      dialToneRef.current.pause();
      dialToneRef.current.volume = 0;
      dialToneRef.current.currentTime = 0;
    }

    // Handle Ring Tone (Recipient)
    if (incomingCall) {
      ringToneRef.current.muted = false;
      ringToneRef.current.volume = 1.0;
      ringToneRef.current.play().catch(e => {
        console.warn("Audio play blocked for ring tone. Waiting for user interaction.", e);
      });
    } else {
      ringToneRef.current.pause();
      ringToneRef.current.volume = 0;
      ringToneRef.current.currentTime = 0;
    }

    return () => {
      dialToneRef.current?.pause();
      ringToneRef.current?.pause();
    };
  }, [activeCall?.isAccepted, activeCall?.isCaller, incomingCall]);

  // CMD+K keyboard shortcut handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      // CMD+K or Ctrl+K — always open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(o => !o);
        return;
      }
      // '/' key — open if not in input field
      if (e.key === '/' && !isInput && !cmdkOpen) {
        e.preventDefault();
        setCmdkOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdkOpen]);

  // Spotlight cursor tracker (desktop only)
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop) return;
    const move = (e: MouseEvent) => {
      setSpotlightPos({ x: e.clientX, y: e.clientY });
      setSpotlightVisible(true);
    };
    const leave = () => setSpotlightVisible(false);
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseleave', leave);
    };
  }, []);

  useEffect(() => {
    const isNative = (window as any).Capacitor?.isNative;
    const hasDismissed = localStorage.getItem('cc_dismissed_download');
    
    if (!isNative && !hasDismissed) {
      const timer = setTimeout(() => setShowDownloadPopup(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const isNative = (window as any).Capacitor?.isNative;
    let listener: any;
    if (isNative) {
      App.addListener('appStateChange', ({ isActive }) => {
        isAppInBackgroundRef.current = !isActive;
      }).then(l => listener = l);
    }
    return () => {
      if (listener) listener.remove();
    };
  }, []);

  useEffect(() => {
    // Request notification permissions on mount
    const requestPermissions = async () => {
      try {
        const isNative = (window as any).Capacitor?.isNative;
        if (isNative) {
          const status = await LocalNotifications.checkPermissions();
          if (status.display !== 'granted') {
             await LocalNotifications.requestPermissions();
          }
        }
      } catch (err) {
        console.warn("Notification permission request failed:", err);
      }
    };
    requestPermissions();

    let clickListener: any;
    const isNative = (window as any).Capacitor?.isNative;
    if (isNative) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const senderId = notification.notification.extra?.sender_id;
        if (senderId) {
           setActiveMessagePartnerId(senderId);
           routerNavigate('/messages');
        }
      }).then(l => clickListener = l);
    }

    return () => {
      if (clickListener) clickListener.remove();
    };
  }, []);

  useEffect(() => {
    // Push Notifications Registration
    const isNative = (window as any).Capacitor?.isNative;
    let regListener: any, errListener: any, receiveListener: any, actionListener: any;
    
    if (isNative && user?.id) {
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('registration', token => {
        profileService.updateFcmToken(user.id, token.value).catch(err => {
          console.error("Failed to update FCM token:", err);
        });
      }).then(l => regListener = l);

      PushNotifications.addListener('registrationError', error => {
        console.error('Error on registration: ' + JSON.stringify(error));
      }).then(l => errListener = l);

      PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('Push notification received: ' + JSON.stringify(notification));
      }).then(l => receiveListener = l);

      PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        routerNavigate('/messages');
        if (notification.notification.data?.sender_id) {
          setActiveMessagePartnerId(notification.notification.data.sender_id);
        }
      }).then(l => actionListener = l);
    }

    return () => {
      if (regListener) regListener.remove();
      if (errListener) errListener.remove();
      if (receiveListener) receiveListener.remove();
      if (actionListener) actionListener.remove();
    };
  }, [user?.id]);

  // Unlock Audio on first interaction (Required for mobile browsers to allow automated play)
  useEffect(() => {
    const unlock = () => {
        if (dialToneRef.current) {
          dialToneRef.current.muted = true;
          dialToneRef.current.volume = 0;
          dialToneRef.current.play().then(() => {
            dialToneRef.current?.pause();
          }).catch(() => {});
        }
        if (ringToneRef.current) {
          ringToneRef.current.muted = true;
          ringToneRef.current.volume = 0;
          ringToneRef.current.play().then(() => {
            ringToneRef.current?.pause();
          }).catch(() => {});
        }
        
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
    };
  }, []);

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
              setActiveCall({ roomId: data.roomId, type: data.type, partnerId: data.callerId, isCaller: currentActive.isCaller, isAccepted: true, startTime: Date.now() });
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
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    // Global Message Notifications
    const messageSub = supabase
      .channel('global-message-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload: any) => {
          const msg = payload.new;
          const content = msg.content || "";
          
          // Trigger local notification if app is native and user is in background OR in a different chat
          const isNative = (window as any).Capacitor?.isNative;
          if (isNative && (isAppInBackgroundRef.current || msg.sender_id !== activeMessagePartnerIdRef.current)) {
             LocalNotifications.schedule({
               notifications: [
                 {
                   title: "New Message",
                   body: content.startsWith('[') ? "Shared a file" : content,
                   id: Math.floor(Date.now() % 1000000) + Math.floor(Math.random() * 1000),
                   schedule: { at: new Date(Date.now() + 100) },
                   sound: "message_sound.mp3",
                   attachments: [],
                   actionTypeId: "",
                   extra: {
                     sender_id: msg.sender_id
                   }
                 }
               ]
             }).catch(err => console.error("Failed to schedule local notification:", err));
          }

          // We use a small delay to ensure toast doesn't conflict with active message page logic
          setTimeout(() => {
             toast("New Message", {
               description: content.startsWith('[') ? "File shared" : content,
               action: {
                 label: "View",
                 onClick: () => routerNavigate('/messages')
               },
             });
          }, 100);
        }
      )
      .subscribe();

    // Global Follow Notifications
    const followSub = supabase
      .channel('global-follow-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'follows',
          filter: `following_id=eq.${user.id}`
        },
        (payload: any) => {
           toast("New Follow", {
             description: "Someone started following you!",
             action: {
               label: "View",
               onClick: () => routerNavigate(`/profile/${user.id}`)
             },
           });
        }
      )
      .subscribe();

    return () => {
      globalPresenceChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(messageSub);
      supabase.removeChannel(followSub);
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
    setActiveCall({ roomId: incomingCall.roomId, type: incomingCall.type, partnerId: incomingCall.callerId, isCaller: false, isAccepted: true, callerName: incomingCall.callerName, startTime: Date.now() });
    setIncomingCall(null);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
  };

  const rejectCall = async () => {
    if (!incomingCall || !user || !globalPresenceChannelRef.current) return;
    
    // Log as Missed Call record in chat for both parties to see the attempt
    try {
      await supabase.from("messages").insert({
        sender_id: incomingCall.callerId,
        receiver_id: user.id,
        content: `[CALL]:Missed ${incomingCall.type === 'video' ? 'Video' : 'Audio'} Call`
      });
    } catch (e) {
      console.error("Failed to log declined call:", e);
    }

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
      if (activeCall.startTime) {
        const durationSeconds = Math.floor((Date.now() - activeCall.startTime) / 1000);
        const durationStr = durationSeconds < 60 ? `${durationSeconds}s` : `${Math.floor(durationSeconds/60)}m ${durationSeconds%60}s`;
        
        // Log to Call History
        await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: activeCall.partnerId,
          content: `[CALL]:${activeCall.type === 'video' ? 'Video' : 'Audio'} Call Ended (${durationStr})`
        });
      } else if (activeCall.isCaller) {
        // Log as Missed Call
        await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: activeCall.partnerId,
          content: `[CALL]:Missed ${activeCall.type === 'video' ? 'Video' : 'Audio'} Call`
        });
      }

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
        await profileService.unsaveProfile(user.id, profileId);
        setSavedTalentIds(prev => prev.filter(id => id !== profileId));
        toast.info("Talent removed from saved list");
      } else {
        await profileService.saveProfile(user.id, profileId);
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
    routerNavigate("/messages");
  };

  const navigate = (p: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => {
    if (AUTH_REQUIRED.includes(p) && !user) {
      routerNavigate("/auth");
      return;
    }

    if (options?.searchType) {
      setSearchInitialType(options.searchType);
    } else if (p === 'search') {
      setSearchInitialType('talents');
    }

    if (options?.openForm) {
      setProjectFormInitiallyOpen(true);
    } else {
      setProjectFormInitiallyOpen(false);
    }

    // Sync URL - important for persistence on refresh
    if (p === "home") routerNavigate("/");
    else if (p === "auth") routerNavigate("/auth");
    else if (p === "profile" && user) routerNavigate(`/profile/${user.id}`);
    else if (p === "search") routerNavigate("/search");
    else routerNavigate(`/${p}`);
  };

  // Auth Guard Logic
  useEffect(() => {
    if (loading) return;
    if (AUTH_REQUIRED.includes(page) && !user) {
      routerNavigate("/auth", { replace: true });
    }
    if (page === "auth" && user) {
      routerNavigate("/", { replace: true });
    }
  }, [page, user, loading, routerNavigate]);

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
      routerNavigate("/auth");
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

  // Compute page-aware ambient glow class
  const ambientClass = (() => {
    if (page === 'messages' || page === 'feed') return 'ambient-glow-blue';
    if (page === 'admin') return 'ambient-glow-ruby';
    return 'ambient-glow-gold';
  })();

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* #11 — Film Grain Noise Texture Overlay */}
      <div className="noise-overlay" />

      {/* Global Technical Grid Background */}
      <div className={`ambient-glow ${ambientClass}`} />

      {/* Spotlight cursor effect (desktop) */}
      <div className="spotlight-container hidden lg:block" aria-hidden>
        <div
          className="spotlight"
          style={{
            left: spotlightPos.x,
            top: spotlightPos.y,
            opacity: spotlightVisible ? 1 : 0,
          }}
        />
      </div>

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
      />

      <main className={`relative flex-1 ${page === 'feed' ? 'overflow-hidden' : 'overflow-y-auto'} ${page === 'messages' || page === 'feed' ? 'pb-0' : 'pb-24 md:pb-0'} ${page !== 'home' && page !== 'feed' && page !== 'messages' ? 'pt-24 md:pt-24' : ''}`}>
        {page !== 'messages' && page !== 'feed' && (
          <Navbar
            onSearch={handleSearch}
            onAuthClick={handleAuthClick}
            onMenuClick={() => setDrawerOpen(true)}
            onLogoClick={() => routerNavigate("/")}
            onPremiumClick={() => navigate("premium")}
            onNotificationClick={() => navigate("notifications")}
            onMessagesClick={() => navigate("messages")}
            onNavigate={navigate}
            activePage={page}
            searchType={searchInitialType}
            onDownloadClick={() => setShowDownloadPopup(true)}
          />
        )}
          <Suspense fallback={<PageLoader />}>
          {page === "home" && <HomePage key={homeRefreshKey} onCategoryClick={handleCategoryClick} onProfileClick={handleProfileClick} onTermsClick={() => routerNavigate("/terms")} onNavigate={navigate} onlineUsers={onlineUsers} onOpenCastingTape={() => setCastingTapeOpen(true)} />}
          {page === "auth" && <AuthPage onSuccess={() => navigate("home")} />}
          {page === "profile" && <ProfilePage onBack={() => routerNavigate("/")} />}
          {page === "search" && <SearchPage query={searchQuery} role={searchRole} initialType={searchInitialType} onTypeChange={setSearchInitialType} onBack={() => routerNavigate("/")} onProfileClick={handleProfileClick} onlineUsers={onlineUsers} castingTapeOpen={castingTapeOpen} onCastingTapeOpenChange={setCastingTapeOpen} />}
          {page === "feed" && (
            <PullToRefresh onRefresh={() => setFeedRefreshKey(k => k + 1)}>
              <FeedPage key={feedRefreshKey} onProfileClick={handleProfileClick} onBack={() => navigate("home")} />
            </PullToRefresh>
          )}
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
          {page === "saved" && <SavedItemsPage />}
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
          </Suspense>
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

      <Suspense fallback={null}>
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

      <PhotoViewerLazy
        url={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        user={user}
        currentUserProfile={currentUserProfile}
      />

      {/* Global Casting Tape (#14) */}
      <Suspense fallback={null}>
        <CastingTape 
          open={castingTapeOpen} 
          onClose={() => setCastingTapeOpen(false)} 
          onProfileClick={handleProfileClick}
          role={searchRole}
        />
      </Suspense>

      <PiPPlayer />

      {/* CMD+K Command Center */}
      <CommandCenter
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onNavigate={(p) => { navigate(p); setCmdkOpen(false); }}
        onProfileClick={(profile) => { handleProfileClick(profile); setCmdkOpen(false); }}
      />
      </Suspense>


      {/* Global Real-time WebRTC Signaling UI Overlay */}
      {activeCall && activeCall.partnerId && user && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Global Incoming Call Full Screen Overlay */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex flex-col items-center justify-between p-12 bg-[#111]/90 backdrop-blur-3xl pointer-events-auto"
          >
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-12 relative z-10 w-full">
              <div className="relative">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary/20 animate-[pulse_2s_ease-in-out_infinite]">
                  <span className="text-5xl md:text-7xl text-primary font-black uppercase tracking-widest">
                    {(incomingCall.callerName || '?')[0]}
                  </span>
                </div>
                {/* Floating particles or rings */}
                <div className="absolute inset-x-0 -bottom-8 flex justify-center">
                    <div className="bg-primary/20 px-4 py-1 rounded-full border border-primary/30 flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                        <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Incoming...</span>
                    </div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-4xl md:text-6xl text-white font-display mb-4 tracking-tight">{incomingCall.callerName}</h3>
                <p className="text-md text-primary/80 uppercase tracking-[0.4em] font-black">{incomingCall.type} Call Inbound</p>
              </div>
            </div>

            <div className="w-full max-w-sm flex items-center gap-8 relative z-10 mb-12">
              <button 
                onClick={rejectCall}
                className="flex-1 group flex flex-col items-center gap-4 transition-all active:scale-90"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-2xl shadow-red-500/20">
                    <PhoneOff size={32} />
                </div>
                <span className="text-[10px] text-white/40 font-black uppercase tracking-widest group-hover:text-red-500 transition-colors">Decline</span>
              </button>

              <button 
                onClick={answerCall}
                className="flex-1 group flex flex-col items-center gap-4 transition-all active:scale-90"
              >
                <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-all shadow-[0_0_50px_rgba(34,197,94,0.4)] relative">
                    {incomingCall.type === 'video' ? <Video size={40} /> : <Phone size={40} />}
                    {/* Ripple effect */}
                    <div className="absolute inset-0 rounded-full animate-ping bg-green-500/40 pointer-events-none" />
                </div>
                <span className="text-[10px] text-white/80 font-black uppercase tracking-widest group-hover:text-green-500 transition-colors">Accept</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDownloadPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[360px] bg-card/80 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
              
              <button 
                onClick={() => {
                  setShowDownloadPopup(false);
                  localStorage.setItem('cc_dismissed_download', 'true');
                }}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={16} />
              </button>
              
              <div className="flex flex-col items-center gap-8 relative z-10">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_40px_rgba(245,197,24,0.15)] transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                    <Smartphone size={48} strokeWidth={1} className="drop-shadow-[0_0_10px_rgba(245,197,24,0.5)]" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-black border-2 border-primary/50 rounded-full flex items-center justify-center animate-bounce">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-3xl font-display text-white tracking-tight leading-none italic uppercase">
                    New <br />
                    <span className="text-primary italic">Android App</span>
                  </h3>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black opacity-60">Mobile Experience v1.0.0</p>
                    <p className="text-[9px] text-primary/80 uppercase tracking-[0.2em] font-bold">Now with Real-time Push Notifications</p>
                  </div>
                </div>

                <div className="w-full space-y-4 pt-4">
                  <a
                    href="/me.castingcall.app.apk"
                    download="CastingCall.apk"
                    onClick={() => {
                      setShowDownloadPopup(false);
                      localStorage.setItem('cc_dismissed_download', 'true');
                    }}
                    className="group relative flex items-center justify-center gap-3 w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_-10px_rgba(245,197,24,0.3)]"
                  >
                    Download APK
                  </a>
                  
                  <button
                    onClick={() => {
                      setShowDownloadPopup(false);
                      localStorage.setItem('cc_dismissed_download', 'true');
                    }}
                    className="text-[10px] text-muted-foreground uppercase tracking-[0.5em] font-black hover:text-primary transition-colors opacity-30 hover:opacity-100 py-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
