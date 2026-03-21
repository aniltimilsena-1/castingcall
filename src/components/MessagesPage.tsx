import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  MoreVertical,
  Copy,
  Pin,
  Forward,
  CornerUpLeft,
  X,
  UserCheck,
  CheckCircle2,
  Crown
} from "lucide-react";
import ProfileDetailDialog from "./ProfileDetailDialog";
import { type PageName } from "./AppDrawer";
import { type Profile } from "@/services/profileService";

function ActionItem({ icon: Icon, label, onClick, color = "text-white/70" }: { icon: any, label: string, onClick: () => void, color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors text-left group`}
    >
      <span className={`text-xs font-normal ${color} group-hover:text-white`}>{label}</span>
      <Icon size={14} className={`${color} group-hover:text-white opacity-40`} />
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
}

export default function MessagesPage({ onNavigate, initialPartnerId }: MessagesPageProps) {
  const { user, profile: currentUserProfile, isPremium } = useAuth();
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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingFileType, setPendingFileType] = useState<'image' | 'video' | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeMenu, setActiveMenu] = useState<{ id: string, x: number, y: number } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track IDs of messages we already inserted optimistically to skip the
  // realtime echo that would otherwise cause a duplicate.
  const sentMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread]);

  useEffect(() => {
    fetch("https://ipapi.co/json/").then(r => r.json()).then(d => setIsNepal(d.country_code === "NP")).catch(() => setIsNepal(false));
  }, []);

  const EMOJIS = ["😀", "😂", "🤣", "😍", "🥰", "😎", "🔥", "💯", "✨", "👍", "❤️", "✅"];

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [user]);

  const loadThread = useCallback(async (partnerId: string) => {
    if (!user) return;
    setSelectedPartner(partnerId);
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", partnerId).maybeSingle();
    setPartnerProfile(p as Profile | null);
    const { data } = await supabase.from("messages").select("*").or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
    setThread(data || []);
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", partnerId).eq("receiver_id", user.id);
  }, [user]);

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

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(state).forEach((key) => {
          onlineIds.add(key);
        });
        setOnlineUsers(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers((prev) => {
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

  useEffect(() => {
    if (!user) return;

    // ── Channel 1: messages arriving FOR this user (receiver) ────────────
    // Filtered server-side — only this user's incoming rows are streamed.
    const incomingChannel = supabase
      .channel(`messages-incoming-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (selectedPartner === msg.sender_id) {
            setThread(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              // Check for optimistic message from this user that might match (unlikely for incoming but safe)
              const optIndex = prev.findIndex(m => 
                m.id.startsWith('optimistic-') && 
                m.content === msg.content && 
                m.sender_id === msg.sender_id
              );
              if (optIndex !== -1) {
                const newThread = [...prev];
                newThread[optIndex] = msg;
                return newThread;
              }
              return [...prev, msg];
            });
            // Mark as read — user is actively viewing this thread
            void supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
          void loadConversations();
        }
      )
      .subscribe();

    // ── Channel 2: messages SENT by this user (sender confirmation) ───────
    // Lets us replace the optimistic row with the real DB row reliably.
    const outgoingChannel = supabase
      .channel(`messages-outgoing-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // Skip: we already handled this via optimistic insert + .select().single()
          // Only act if somehow we don't have it yet (e.g. sent from another tab)
          if (sentMessageIds.current.has(msg.id)) {
            sentMessageIds.current.delete(msg.id);
            return;
          }
          if (selectedPartner === msg.receiver_id) {
            setThread(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              // Reconcile optimistic: swap the client-generated row for the real one
              const optIndex = prev.findIndex(m => 
                m.id.startsWith('optimistic-') && 
                m.content === msg.content && 
                m.receiver_id === msg.receiver_id
              );
              if (optIndex !== -1) {
                const newThread = [...prev];
                newThread[optIndex] = msg;
                return newThread;
              }
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    // ── Channel 3: updates/deletes to ANY message relevant to this user ─
    // ── Channel 3: updates/deletes specifically FOR this user ───────────
    const updatesChannel = supabase
      .channel(`message-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`
        },
        (payload) => {
          const msg = payload.new as Message;
          if (selectedPartner === msg.sender_id || selectedPartner === msg.receiver_id) {
            setThread(prev => prev.map(m => m.id === msg.id ? msg : m));
          }
          void loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`
        },
        (payload) => {
          setThread(prev => prev.filter(m => m.id !== payload.old.id));
          void loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [user, selectedPartner, loadConversations]);

  useEffect(() => {
    if (initialPartnerId) {
      loadThread(initialPartnerId);
    }
  }, [initialPartnerId, loadThread]);



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

    const { error, data } = await supabase
      .from("messages")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setThread(prev => prev.filter(m => m.id !== optimistic.id));
      setNewMessage(text);
    } else {
      // Register the real ID so the outgoing realtime echo is skipped
      sentMessageIds.current.add((data as Message).id);
      // Swap optimistic row for the real DB row
      setThread(prev => prev.map(m => m.id === optimistic.id ? data as Message : m));
      void loadConversations();
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
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (!error) loadThread(selectedPartner!);
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

  const cancelPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setPendingFileType(null);
  };

  const handleFileUpload = async () => {
    if (!pendingFile || !user || !selectedPartner) return;
    setUploading(true);
    const fileToUpload = pendingFile;
    const type = pendingFileType;

    cancelPendingFile(); // Clear preview immediately

    const path = `${user.id}/messages/${Date.now()}.${fileToUpload.name.split('.').pop()}`;

    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, fileToUpload);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const content = type === 'image' ? `[IMAGE]:${publicUrl}` : `[VIDEO]:${publicUrl}`;

      const { error: msgError } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedPartner,
        content
      });
      if (msgError) throw msgError;

      loadThread(selectedPartner);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-[1250px] mx-auto px-4 py-4 md:py-6 h-[calc(100dvh-116px)] sm:h-[calc(100dvh-64px)] flex gap-6">
      <div className={`${selectedPartner ? "hidden md:flex" : "flex"} w-full md:w-[350px] bg-[#1c1c1c] border border-border/20 rounded-3xl overflow-hidden flex-col shadow-xl`}>
        <div className="p-4 space-y-4">
          <h1 className="text-2xl text-white font-normal">Message Hub</h1>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
            <input 
              placeholder="Search Active Chats" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/30 rounded-full pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations
            .filter(c => c.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) || c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((c) => (
            <button key={c.partnerId} onClick={() => loadThread(c.partnerId)} className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-white/5 transition-all ${selectedPartner === c.partnerId ? "bg-white/5" : ""}`}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  openProfile(c.partnerId);
                }}
                className="w-14 h-14 rounded-full bg-secondary border border-border/10 overflow-hidden flex items-center justify-center relative hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                {c.partnerPhoto ? <img src={c.partnerPhoto} className="w-full h-full object-cover" /> : <span className="text-xl text-primary">{c.partnerName[0]}</span>}
                {onlineUsers.has(c.partnerId) && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1c1c1c] rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[15px] text-white truncate">{c.partnerName}</div>
                <div className="text-[13px] text-white/40 truncate">{c.lastMessage}</div>
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
                  <p className="text-white text-sm mb-0.5">Upgrade for {isNepal ? "NPR 499" : "$4.99"}</p>
                  <p className="text-[0.65rem] text-white/40 uppercase tracking-widest leading-normal">{isNepal ? "Unlock local & global limits" : "Go Global Pro"}</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.("premium")} className="w-full bg-primary text-black py-2.5 rounded-xl text-[0.65rem] font-normal uppercase tracking-[2px]">
                {isNepal ? "Pay with eSewa/Khalti" : "Upgrade via Stripe"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex-1 flex flex-col bg-[#1c1c1c] border border-border/20 rounded-3xl overflow-hidden shadow-xl ${!selectedPartner ? "hidden md:flex items-center justify-center" : "flex"}`}>
        {!selectedPartner ? (
          <div className="text-center p-8 space-y-4">
            <MessageSquare size={64} className="text-white/10 mx-auto" />
            <p className="text-white/30 text-sm uppercase tracking-[0.3em] font-display">Cast your message worldwide</p>
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
                  className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/10 relative cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {partnerProfile?.photo_url ? <img src={partnerProfile.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-primary">{partnerProfile?.name?.[0]}</div>}
                  {onlineUsers.has(selectedPartner) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#1c1c1c] rounded-full" />
                  )}
                </div>
                <div>
                  <div className="text-white font-medium flex items-center gap-2">
                    {partnerProfile?.name}
                    {onlineUsers.has(selectedPartner) ? (
                      <span className="text-[0.6rem] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-bold">Online</span>
                    ) : (
                      <span className="text-[0.6rem] bg-white/5 text-white/40 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Offline</span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Global Talent</div>
                </div>
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
                            <div className={`mb-1 px-3 py-2 rounded-xl text-[11px] bg-white/5 border border-white/10 ${isMine ? "mr-1 text-right" : "ml-1 text-left"} text-white/40 italic flex flex-col gap-0.5 max-w-[200px] truncate`}>
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
                            isMine ? "bg-primary text-black rounded-br-none" : "bg-white/5 text-white border border-white/10 rounded-bl-none shadow-lg"
                          }`}
                        >
                          {m.content.startsWith('[IMAGE]:') ? (
                        <div className="relative group/img bg-white/5 min-w-[200px] min-h-[150px] flex items-center justify-center">
                          <img
                            key={`${m.id}-img`}
                            src={m.content.replace('[IMAGE]:', '')}
                            className="w-full h-auto max-h-[500px] object-contain block opacity-0 transition-opacity duration-300"
                            style={{ imageRendering: 'auto' }}
                            onLoad={(e) => {
                              const target = e.currentTarget;
                              target.style.opacity = '1';
                              const parent = target.parentElement;
                              if (parent) parent.classList.remove('bg-white/5');
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
                      <div className="text-[9px] text-white/20 uppercase tracking-[0.2em] px-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                      onClick={cancelPendingFile}
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
                  className="flex-1 bg-white/5 border-none rounded-full px-5 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary/20 outline-none"
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
    </div>
  );
}
