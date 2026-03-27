import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageSquare,
  Search,
  PlusCircle,
  Image as ImageIcon,
  Smile,
  ThumbsUp,
  Reply,
  Trash2,
  Edit2,
  Download,
  ArrowUpRight,
  ChevronLeft,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Pin,
  Forward,
  Info,
  MoreVertical,
  Copy,
  CornerUpLeft,
  X,
  UserCheck,
  CheckCircle2,
  Crown
} from "lucide-react";
import ProfileDetailDialog from "./ProfileDetailDialog";
import WebRTCCall from "./WebRTCCall";
import { type PageName } from "./AppDrawer";
import { type Profile } from "@/services/profileService";
import { messageService } from "@/services/messageService";

function ActionItem({ icon: Icon, label, onClick, color = "text-muted-foreground" }: { icon: any, label: string, onClick: () => void, color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40 transition-colors text-left group`}
    >
      <span className={`text-xs font-normal ${color} group-hover:text-foreground`}>{label}</span>
      <Icon size={14} className={`${color} group-hover:text-foreground opacity-40`} />
    </button>
  );
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean | null;
  created_at: string;
  reply_to_id?: string | null;
  is_edited?: boolean;
  is_pinned?: boolean | null;
  reactions?: Record<string, string[]>;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  partnerPhoto?: string | null;
}

interface MessagesPageProps {
  onNavigate?: (page: PageName) => void;
  initialPartnerId?: string | null;
  onlineUsers: Set<string>;
  incomingCall: any;
  activeCall: any;
  onStartCall: (targetId: string, partnerName: string, type: 'video' | 'audio') => void;
  onEndCall: () => void;
}

export default function MessagesPage({ 
  onNavigate, 
  initialPartnerId,
  onlineUsers,
  incomingCall,
  activeCall,
  onStartCall,
  onEndCall
}: MessagesPageProps) {
  const { user, profile: currentUserProfile, isPremium } = useAuth();
  const { confirm: confirmAction } = useConfirmation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);
  const [isNepal, setIsNepal] = useState<boolean | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingFileType, setPendingFileType] = useState<'image' | 'video' | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeMenu, setActiveMenu] = useState<{ id: string, x: number, y: number } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const globalPresenceChannelRef = useRef<any>(null);

  // Track IDs of messages we already inserted optimistically to skip the
  // realtime echo that would otherwise cause a duplicate.
  const sentMessageIds = useRef<Set<string>>(new Set());

  // Keep a stable ref of the thread for safely making background comparisons
  const threadRef = useRef<Message[]>(thread);
  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  // 1. Core Scroll management - ensures we see the latest messages
  useEffect(() => {
    let timeoutId: any;
    if (scrollRef.current && thread.length > 0) {
      const el = scrollRef.current;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 600;
      const lastMessage = thread[thread.length - 1];
      const sentByMe = lastMessage?.sender_id === user?.id;

      // Logic: Scroll if I just sent a message, or if I am already looking at the bottom.
      // We use a small timeout to let the DOM paint fully (important for images/videos).
      if (isNearBottom || sentByMe) {
        timeoutId = setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 100);
      }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [thread, user?.id]);

  // 2. Force scroll to bottom when switching conversations 
  useEffect(() => {
    let timeoutId: any;
    if (selectedPartner && scrollRef.current) {
        timeoutId = setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 500); // Higher delay for initial load to account for API results
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedPartner]);

  useEffect(() => {
    fetch("https://ipapi.co/json/").then(r => r.json()).then(d => setIsNepal(d.country_code === "NP")).catch(() => setIsNepal(false));
  }, []);

  const EMOJIS = ["😀", "😂", "🤣", "😍", "🥰", "😎", "🔥", "💯", "✨", "👍", "❤️", "✅"];

  const loadConversations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const { data: messages } = await supabase.from("messages").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false });
      if (!messages) { setLoading(false); return; }
      const partnerIds = new Set<string>();
      messages.forEach((m) => { partnerIds.add(m.sender_id === user.id ? m.receiver_id : m.sender_id); });
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, photo_url").in("user_id", Array.from(partnerIds));
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      const convMap = new Map<string, Conversation>();
      messages.forEach((m) => {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!convMap.has(partnerId)) {
          const p = profileMap.get(partnerId);
          let preview = m.content;
          if (preview.startsWith('[IMAGE]:')) preview = "📷 Photo";
          else if (preview.startsWith('[VIDEO]:')) preview = "🎥 Video";
          else if (preview.startsWith('[FILE]:')) preview = "📎 File";

          convMap.set(partnerId, {
            partnerId,
            partnerName: p?.name || "Unknown",
            lastMessage: preview,
            lastTime: m.created_at,
            unread: 0,
            partnerPhoto: p?.photo_url || null
          });
        }
        if (m.receiver_id === user.id && !m.is_read) {
          const conv = convMap.get(partnerId);
          if (conv) conv.unread++;
        }
      });

      const sortedConvs = Array.from(convMap.values()).sort((a, b) =>
        new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      );

      setConversations(sortedConvs);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  const loadThread = useCallback(async (partnerId: string) => {
    if (!user) return;
    setSelectedPartner(partnerId);
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", partnerId).maybeSingle();
    setPartnerProfile(p as Profile | null);
    const { data } = await supabase.from("messages").select("*").or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
    setThread(data || []);
    const { error: readError } = await supabase.from("messages").update({ is_read: true }).eq("sender_id", partnerId).eq("receiver_id", user.id).eq("is_read", false);
    if (!readError) {
      void loadConversations(true);
    }
  }, [user, loadConversations]);

  const openProfile = async (id: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", id).single();
    if (error) {
      toast.error("Could not load profile");
      return;
    }
    setViewingProfile(data as Profile);
    setIsProfileOpen(true);
  };

  const onToggleSave = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (!user) return;
    const isSaved = savedTalentIds.includes(profileId);
    
    try {
      if (isSaved) {
        const { error } = await supabase.from("saved_talents").delete().eq("user_id", user.id).eq("talent_profile_id", profileId);
        if (error) {
          toast.error(`Could not unsave: ${error.message}`);
          return;
        }
        setSavedTalentIds(prev => prev.filter(id => id !== profileId));
        toast.success("Removed from bookmarks");
      } else {
        const { error } = await supabase.from("saved_talents").insert({ user_id: user.id, talent_profile_id: profileId });
        if (error) {
          toast.error(`Could not save: ${error.message}`);
          return;
        }
        setSavedTalentIds(prev => [...prev, profileId]);
        toast.success("Added to bookmarks");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("An unexpected error occurred while saving.");
    }
  };

  useEffect(() => {
    if (!user) return;
    loadConversations();
    const fetchSaved = async () => {
      const { data } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
      setSavedTalentIds(data?.map(s => s.talent_profile_id) || []);
    };
    fetchSaved();
  }, [user, loadConversations]);

  // Signaling and Presence are now handled in Index.tsx and passed as props
  // We keep this empty or remove it.
  useEffect(() => {
    console.log("MessagesPage mounted. onlineUsers count:", onlineUsers.size);
  }, [onlineUsers.size]);

  // Keep track of the current selected partner safely for the realtime listener
  const selectedPartnerRef = useRef(selectedPartner);
  useEffect(() => {
    selectedPartnerRef.current = selectedPartner;
  }, [selectedPartner]);

  // Robust polling mechanism as a fallback for when Supabase Realtime is dropping events or not properly configured
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      void loadConversations(true);
      
      // If we have an active conversation, mark incoming messages as read periodically
      if (selectedPartner) {
          try {
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("sender_id", selectedPartner)
              .eq("receiver_id", user.id)
              .eq("is_read", false);
          } catch (e) {
            console.error("Failed to execute background read update:", e);
          }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, selectedPartner, loadConversations]);

  useEffect(() => {
    if (!user) return;

    // ── Single Robust Real-time Channel for ALL Messages ──────────────────
    console.log("Setting up real-time message subscription for user:", user.id);
    const messageChannel = supabase
      .channel(`user-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const { eventType, new: newMsg, old: oldMsg } = payload;
          const msg = (newMsg || oldMsg) as Message;

          console.log("Real-time message event:", eventType, msg.id);

          // Only process if the user is a participant
          if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return;

          const activePartner = selectedPartnerRef.current; 

          if (eventType === 'INSERT') {
            console.log("New message caught:", msg.id, "Sender:", msg.sender_id, "Receiver:", msg.receiver_id, "ActivePartner:", activePartner);
            
            // Check if this message belongs to the current open conversation
            // Use toString() just in case of ID type mismatch (though usually UUID strings)
            const isRelevant = 
              (activePartner?.toString() === msg.sender_id?.toString()) || 
              (activePartner?.toString() === msg.receiver_id?.toString());

            if (isRelevant) {
              console.log("Message is relevant to current thread. Updating UI.");
              setThread(prev => {
                // If it's already there (optimistic match), skip
                if (prev.some(m => m.id === msg.id)) return prev;
                
                // Replace optimistic matches even more strictly
                const optIndex = prev.findIndex(m => 
                  m.id.toString().startsWith('optimistic-') && 
                  m.content === msg.content && 
                  m.sender_id === msg.sender_id
                );
                
                if (optIndex !== -1) {
                  const nt = [...prev];
                  nt[optIndex] = msg;
                  return nt;
                }
                return [...prev, msg];
              });
              
              if (msg.receiver_id === user.id && activePartner === msg.sender_id) {
                void supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
              }
            }
          } else if (eventType === 'UPDATE') {
            const isRelevant = 
              (activePartner?.toString() === msg.sender_id?.toString()) || 
              (activePartner?.toString() === msg.receiver_id?.toString());
              
            if (isRelevant) {
              setThread(prev => prev.map(m => m.id === msg.id ? msg : m));
            }
          } else if (eventType === 'DELETE') {
            setThread(prev => prev.filter(m => m.id !== msg.id));
          }

          // Always refresh conversation list for ANY message event involving the user
          // to update previews and unread counts in the sidebar.
          void loadConversations(true); 
        }
      )
      .subscribe((status) => {
        console.log("Real-time message channel status:", status);
      });

    return () => {
      console.log("Cleaning up message channel");
      supabase.removeChannel(messageChannel);
    };
  }, [user, loadConversations]);

  useEffect(() => {
    if (initialPartnerId) {
      loadThread(initialPartnerId);
    }
  }, [initialPartnerId, loadThread]);

  const startCall = (type: 'video' | 'audio') => {
    if (!selectedPartner || !partnerProfile) return;
    onStartCall(selectedPartner, partnerProfile.name || 'User', type);
  };
  
  // Call answering logic is moved to Index.tsx
  const answerCall = () => {};
  const rejectCall = () => {};
  const endCall = () => { onEndCall(); };

  const sendMessage = async () => {
    if (!user || !selectedPartner) return;

    if (pendingFile) {
      await handleFileUpload();
      return;
    }

    const text = newMessage.trim();
    if (!text) return;

    // Handle Edit
    if (editingMessage) {
      const { error } = await supabase
        .from("messages")
        .update({ content: text, is_edited: true })
        .eq("id", editingMessage.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        setThread(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: text, is_edited: true } : m));
        setEditingMessage(null);
        setNewMessage("");
      }
      return;
    }

    // Handle Reply
    const payload: any = { 
      sender_id: user.id, 
      receiver_id: selectedPartner, 
      content: text 
    };
    if (replyingTo) {
      payload.reply_to_id = replyingTo.id;
    }

    // Optimistically append to thread
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedPartner,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
      reply_to_id: replyingTo?.id,
    };
    setThread(prev => [...prev, optimistic]);
    setNewMessage("");
    setReplyingTo(null);

    try {
      const data = await messageService.sendMessage(user.id, selectedPartner, text, undefined, undefined, replyingTo?.id);
      
      if (!data) throw new Error("No data returned from sendMessage");
      
      // Register the real ID so the outgoing realtime echo is skipped
      sentMessageIds.current.add((data as Message).id);
      // Swap optimistic row for the real DB row
      setThread(prev => prev.map(m => m.id === optimistic.id ? data as Message : m));
      void loadConversations();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      setThread(prev => prev.filter(m => m.id !== optimistic.id));
      setNewMessage(text);
    }
  };

  const togglePin = async (m: Message) => {
    const newVal = !m.is_pinned;
    // Cast to any for the update object to satisfy Supabase's generated types while using custom is_pinned column
    const { error } = await supabase
      .from("messages")
      .update({ is_pinned: newVal } as any)
      .eq("id", m.id);

    if (error) {
      console.error("Pin error:", error);
      toast.error(`Failed to ${newVal ? 'pin' : 'unpin'} message: ${error.message}`);
    } else {
      setThread(prev => prev.map(msg => msg.id === m.id ? { ...msg, is_pinned: newVal } : msg));
      toast.success(newVal ? "Message pinned" : "Message unpinned");
    }
  };

  const forwardMessageToTarget = async (msg: Message, targetId: string) => {
    if (!user || !targetId) return;
    
    let content = msg.content;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: targetId,
      content
    });
    
    if (!error) {
      toast.success("Message forwarded");
      setForwardingMessage(null);
      if (targetId === selectedPartner) {
        void loadThread(targetId);
      }
      void loadConversations();
    } else {
      toast.error(`Forwarding failed: ${error.message}`);
    }
  };

  const deleteMessage = async (id: string) => {
    confirmAction({
      title: "Delete Message",
      description: "Are you sure you want to delete this message? This action cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const { error } = await supabase.from("messages").delete().eq("id", id);
        if (!error) {
          toast.success("Message deleted");
          loadThread(selectedPartner!);
        } else {
          toast.error("Failed to delete message");
        }
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setPendingFile(file);
    setPendingFileType(type);

    const url = URL.createObjectURL(file);
    setPendingPreviewUrl(url);
  };

  const cancelPendingFile = (revoke = true) => {
    if (revoke && pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setPendingFileType(null);
  };

  const handleFileUpload = async () => {
    if (!pendingFile || !user || !selectedPartner) return;
    setUploading(true);
    const fileToUpload = pendingFile;
    const type = pendingFileType;
    const preview = pendingPreviewUrl;
    
    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: selectedPartner,
      content: type === 'image' ? `[IMAGE]:${preview}` : `[VIDEO]:${preview}`,
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    setThread(prev => [...prev, optimistic]);
    cancelPendingFile(false); // Clear input state, but defer revocation until swap

    const path = `${user.id}/messages/${Date.now()}.${fileToUpload.name.split('.').pop()}`;

    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, fileToUpload);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const content = type === 'image' ? `[IMAGE]:${publicUrl}` : `[VIDEO]:${publicUrl}`;

      const msgData = await messageService.sendMessage(user.id, selectedPartner, content);

      if (!msgData) throw new Error("Failed to create message data");

      sentMessageIds.current.add(msgData.id);
      setThread(prev => {
        const nt = prev.map(m => m.id === optimisticId ? msgData as Message : m);
        if (preview) URL.revokeObjectURL(preview); // Deferred revocation
        return nt;
      });
      void loadConversations(true);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
      // Remove optimistic row on failure and clean up blob
      setThread(prev => prev.filter(m => m.id !== optimisticId));
      if (preview) URL.revokeObjectURL(preview);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-screen h-[100dvh] flex bg-background overflow-hidden fixed inset-0 z-[200]">
      <div className={`${selectedPartner ? "hidden md:flex" : "flex"} w-full md:w-[380px] bg-sidebar-background border-r border-border/10 flex-col shadow-2xl relative z-10`}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-foreground font-normal flex items-center gap-3">
              <button 
                onClick={() => onNavigate?.("home")}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Back to Home"
              >
                <ChevronLeft size={24} />
              </button>
              Hub
            </h1>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 w-4 h-4" />
            <input 
              placeholder="Search Active Chats" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/30 rounded-full pl-10 pr-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/30" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations
            .filter(c => c.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) || c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((c) => (
            <button key={c.partnerId} onClick={() => loadThread(c.partnerId)} className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-foreground/5 transition-all ${selectedPartner === c.partnerId ? "bg-foreground/5" : ""}`}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  openProfile(c.partnerId);
                }}
                className="relative cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-secondary border border-border/10 overflow-hidden flex items-center justify-center">
                  {c.partnerPhoto ? <img src={c.partnerPhoto} className="w-full h-full object-cover" /> : <span className="text-xl text-primary">{c.partnerName[0]}</span>}
                </div>
                {onlineUsers?.has(c.partnerId) && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-sidebar-background shadow-lg shadow-green-500/20 z-10" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[15px] text-foreground truncate">{c.partnerName}</div>
                <div className="text-[13px] text-muted-foreground truncate">{c.lastMessage}</div>
              </div>
              {c.unread > 0 && <div className="w-3 h-3 bg-primary rounded-full mr-2 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />}
            </button>
          ))}
        </div>

        {!isPremium && (
          <div className="p-4 border-t border-white/5">
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl p-5">
              <div className="flex items-start gap-4 mb-4">
                <Crown className="text-primary w-10 h-10" />
                <div className="flex-1">
                  <p className="text-foreground text-sm mb-0.5">Upgrade for {isNepal ? "NPR 499" : "$4.99"}</p>
                  <p className="text-[0.65rem] text-muted-foreground uppercase tracking-widest leading-normal">{isNepal ? "Unlock local & global limits" : "Go Global Pro"}</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.("premium")} className="w-full bg-primary text-black py-2.5 rounded-xl text-[0.65rem] font-normal uppercase tracking-[2px]">
                {isNepal ? "Pay with eSewa/Khalti" : "Upgrade via Stripe"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex-1 flex flex-col bg-background overflow-hidden ${!selectedPartner ? "hidden md:flex items-center justify-center" : "flex"}`}>
        {!selectedPartner ? (
          <div className="text-center p-8 space-y-4">
            <MessageSquare size={64} className="text-foreground/10 mx-auto" />
            <p className="text-muted-foreground/30 text-sm uppercase tracking-[0.3em] font-display">Cast your message worldwide</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-white transition-colors" 
                  onClick={() => setSelectedPartner(null)}
                >
                  <ChevronLeft size={24} />
                </button>
                <div 
                  onClick={() => openProfile(selectedPartner!)}
                  className="relative cursor-pointer group/header-avatar"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border group-hover/header-avatar:border-primary/50 transition-colors">
                    {partnerProfile?.photo_url ? <img src={partnerProfile.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary">{partnerProfile?.name?.[0]}</div>}
                  </div>
                  {onlineUsers?.has(selectedPartner!) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-lg shadow-green-500/20 z-10" />
                  )}
                </div>
                <div>
                  <div className="text-foreground font-medium flex items-center gap-2">
                    {partnerProfile?.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Global Talent</div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={() => startCall('audio')} 
                  disabled={!!activeCall || !!incomingCall}
                  className={`p-2.5 transition-all rounded-full ${activeCall || incomingCall ? 'opacity-30 pointer-events-none' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`} 
                  title="Audio Call"
                >
                  <Phone size={20} />
                </button>
                <button 
                  onClick={() => startCall('video')} 
                  disabled={!!activeCall || !!incomingCall}
                  className={`p-2.5 transition-all rounded-full ${activeCall || incomingCall ? 'opacity-30 pointer-events-none' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`} 
                  title="Video Call"
                >
                  <Video size={20} />
                </button>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar flex flex-col"
            >
                {thread.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  const isMenuActive = activeMenu?.id === m.id;

                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"} group relative`}
                    >
                      {/* Message Thread Item Container */}
                      <div className="relative group/bubble max-w-[85%]">
                        {/* Reply Preview */}
                        {m.reply_to_id && (() => {
                          const parent = thread.find(msg => msg.id === m.reply_to_id);
                          const parentContent = parent?.content?.startsWith('[IMAGE]:') ? 'Photo' : parent?.content || 'Original message';
                          return (
                            <div className={`mb-1 px-3 py-2 rounded-xl text-[11px] bg-foreground/5 border border-border/10 ${isMine ? "mr-1 text-right" : "ml-1 text-left"} text-muted-foreground italic flex flex-col gap-0.5 max-w-[200px] truncate`}>
                              <span className="font-bold opacity-60 uppercase text-[9px] tracking-widest">{isMine ? "Replying..." : "Replied..."}</span>
                              <span className="truncate">{parentContent}</span>
                            </div>
                          );
                        })()}

                        <div 
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveMenu({ id: m.id, x: e.clientX, y: e.clientY });
                          }}
                          className={`rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.98] relative ${
                            m.content.startsWith('[CALL]:') ? "" : (isMine ? "bg-primary text-black rounded-br-none" : "bg-card text-foreground border border-border rounded-bl-none shadow-lg")
                          }`}
                        >
                          {m.content.startsWith('[CALL]:') ? (
                            <div className={`flex items-center gap-3 px-5 py-3 ${isMine ? "bg-primary/20 text-primary border-primary/30" : "bg-card text-foreground border border-border"} rounded-2xl border shadow-lg backdrop-blur-sm`}>
                              <div className={`p-2 rounded-full ${isMine ? "bg-primary/30" : "bg-secondary"}`}>
                                {m.content.includes('Missed') ? <PhoneOff size={18} /> : 
                                 (m.content.includes('Video') ? <Video size={18} /> : <Phone size={18} />)}
                              </div>
                              <div className="flex flex-col">
                                  <span className="font-bold text-xs uppercase tracking-tighter">{m.content.replace('[CALL]:', '').split(' (')[0]}</span>
                                  {m.content.includes('(') && (
                                     <span className="text-[10px] opacity-60 font-medium">{m.content.split('(')[1].replace(')', '')}</span>
                                  )}
                              </div>
                            </div>
                          ) : m.content.startsWith('[IMAGE]:') ? (
                        <div className="relative group/img bg-secondary/20 min-w-[200px] min-h-[150px] flex items-center justify-center">
                          <img
                            key={`${m.id}-img`}
                            src={m.content.replace('[IMAGE]:', '')}
                            className="w-full h-auto max-h-[500px] object-contain block opacity-0 transition-opacity duration-300"
                            style={{ imageRendering: 'auto' }}
                            onLoad={(e) => {
                              const target = e.currentTarget;
                              target.style.opacity = '1';
                              const parent = target.parentElement;
                              if (parent) parent.classList.remove('bg-secondary/20');
                              
                              if (scrollRef.current) {
                                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                                // Auto scroll if we are within roughly two full heights of the bottom
                                const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 600;
                                if (isNearBottom) {
                                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                                }
                              }
                            }}
                            onError={(e) => {
                              console.error("Image load error for message:", m.id);
                              e.currentTarget.src = "https://placehold.co/400x300/1c1c1c/fbb724?text=Image+Load+Error";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover/img:pointer-events-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = m.content.replace('[IMAGE]:', '');
                                link.download = `photo_${Date.now()}`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="p-2 bg-primary/90 text-black rounded-full shadow-lg hover:scale-110 transition-transform"
                              title="Save Photo"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </div>
                      ) : m.content.startsWith('[VIDEO]:') ? (
                        <div className="relative bg-black min-w-[200px] min-h-[150px] group/vid">
                          <video
                            key={`${m.id}-video`}
                            src={m.content.replace('[VIDEO]:', '')}
                            controls
                            className="w-full h-auto max-h-[500px] block"
                            preload="metadata"
                          />
                          <div className="absolute top-2 right-2 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = m.content.replace('[VIDEO]:', '');
                                link.download = `video_${Date.now()}`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="p-2 bg-black/60 text-white rounded-full hover:bg-primary hover:text-black transition-all"
                              title="Save Video"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      )}
                        </div>

                        {/* Edited Indicator */}
                        {m.is_edited && (
                          <div className={`text-[10px] text-white/20 mt-1 ${isMine ? "text-right mr-1" : "text-left ml-1"}`}>
                            (edited)
                          </div>
                        )}

                        {/* Popup Action Menu */}
                        {isMenuActive && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="fixed z-[110] bg-[#2a2a2a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl min-w-[160px] overflow-hidden flex flex-col pointer-events-auto"
                              style={{ 
                                left: Math.min(activeMenu!.x, window.innerWidth - 180), 
                                top: Math.min(activeMenu!.y, window.innerHeight - 250),
                                transformOrigin: 'top center'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ActionItem icon={CornerUpLeft} label="Reply" onClick={() => { setReplyingTo(m); setActiveMenu(null); }} />
                              {isMine && !m.content.startsWith('[') && <ActionItem icon={Edit2} label="Edit" onClick={() => { setEditingMessage(m); setNewMessage(m.content); setActiveMenu(null); }} />}
                              <ActionItem icon={Forward} label="Forward" onClick={() => { setForwardingMessage(m); setActiveMenu(null); }} />
                              <ActionItem icon={Copy} label="Copy" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied to clipboard"); setActiveMenu(null); }} />
                              <ActionItem icon={Pin} label={m.is_pinned ? "Unpin" : "Pin"} onClick={() => { togglePin(m); setActiveMenu(null); }} />
                              {isMine && <ActionItem icon={Trash2} label="Delete" color="text-red-400" onClick={() => { deleteMessage(m.id); setActiveMenu(null); }} />}
                            </motion.div>
                          </>
                        )}
                        
                        {/* Pinned Marker */}
                        {m.is_pinned && (
                          <div className={`absolute -top-2 ${isMine ? "-right-1" : "-left-1"} bg-primary/20 p-1 rounded-full border border-primary/30 z-10`}>
                            <Pin size={10} className="text-primary fill-primary/50" />
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className="text-[9px] text-white/20 uppercase tracking-[0.2em]">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {isMine && (
                          <div 
                            className={`flex items-center transition-all ${m.is_read ? "text-primary scale-110" : "text-white/10"}`}
                            title={m.is_read ? "Seen" : "Sent"}
                          >
                            <CheckCircle2 size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area Enhancements (Reply/Edit Previews) */}
              <div className="px-4">
                {(replyingTo || editingMessage) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-t-2xl px-4 py-3 -mb-3 relative z-[20] backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        {replyingTo ? <Reply className="text-primary w-4 h-4" /> : <Edit2 className="text-primary w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-primary uppercase font-bold tracking-[2px]">
                          {replyingTo ? "Replying to message" : "Editing message"}
                        </div>
                        <div className="text-xs text-white/50 truncate max-w-[200px]">
                          {replyingTo ? replyingTo.content : editingMessage?.content}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setReplyingTo(null); setEditingMessage(null); if (editingMessage) setNewMessage(""); }}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={16} className="text-white/40" />
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="p-4 pt-1 space-y-3">
                <AnimatePresence>
                  {pendingPreviewUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-32 h-32 rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/10 mb-2"
                  >
                    {pendingFileType === 'image' ? (
                      <img src={pendingPreviewUrl} className="w-full h-full object-cover" />
                    ) : (
                      <video src={pendingPreviewUrl} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => cancelPendingFile()}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <label className="p-2 hover:bg-white/5 rounded-full cursor-pointer transition-colors relative">
                  <ImageIcon size={20} className={pendingFile ? "text-primary/40" : "text-primary"} />
                  <input
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    disabled={!!pendingFile}
                  />
                </label>

                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder={pendingFile ? "Add a caption..." : "Send global message..."}
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-primary/20 rounded-full px-5 py-2.5 text-sm text-black dark:text-white focus:ring-1 focus:ring-primary/40 outline-none"
                />

                {(newMessage.trim() || pendingFile) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={sendMessage}
                    disabled={uploading}
                    className="p-2.5 bg-primary text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    <Send size={18} fill="currentColor" />
                  </motion.button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ProfileDetailDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        profile={viewingProfile}
        user={user}
        currentUserProfile={currentUserProfile}
        isSaved={viewingProfile ? savedTalentIds.includes(viewingProfile.id) : false}
        onToggleSave={onToggleSave}
      />

      {/* Forwarding Modal */}
      <AnimatePresence>
        {forwardingMessage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#1c1c1c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-medium">Forward to...</h3>
                <button onClick={() => setForwardingMessage(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
                {conversations.map(c => (
                  <button 
                    key={c.partnerId}
                    onClick={() => forwardMessageToTarget(forwardingMessage, c.partnerId)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/10">
                      {c.partnerPhoto ? <img src={c.partnerPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary text-sm uppercase">{c.partnerName[0]}</div>}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white text-sm group-hover:text-primary transition-colors truncate">{c.partnerName}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-widest">Global Talent</div>
                    </div>
                    <Forward size={14} className="text-white/20 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
              <div className="p-4 bg-white/5 mx-4 mb-4 rounded-2xl border border-white/10">
                <span className="text-[10px] text-primary uppercase font-bold tracking-[2px] block mb-1">Message Preview</span>
                <p className="text-xs text-white/40 italic line-clamp-2">{forwardingMessage.content}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WebRTCCall and IncomingCall UI are now rendered globally by Index.tsx */}

    </div>
  );
}
