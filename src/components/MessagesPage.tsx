import { useState, useEffect } from "react";
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
  Edit3,
  MoreVertical,
  X,
  Check,
  Crown,
  Globe
} from "lucide-react";
import ProfileDetailDialog from "./ProfileDetailDialog";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean | null;
  created_at: string;
  reply_to_id?: string | null;
  is_edited?: boolean;
  reactions?: Record<string, string[]>;
  reply_content?: string;
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
  onNavigate?: (page: any) => void;
  initialPartnerId?: string | null;
}

export default function MessagesPage({ onNavigate, initialPartnerId }: MessagesPageProps) {
  const { user, profile: currentUserProfile, isPremium } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);
  const [isNepal, setIsNepal] = useState<boolean | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("https://ipapi.co/json/").then(r => r.json()).then(d => setIsNepal(d.country_code === "NP")).catch(() => setIsNepal(false));
  }, []);

  const EMOJIS = ["😀", "😂", "🤣", "😍", "🥰", "😎", "🔥", "💯", "✨", "👍", "❤️", "✅"];

  useEffect(() => {
    if (!user) return;
    loadConversations();
    const fetchSaved = async () => {
      const { data } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
      setSavedTalentIds(data?.map(s => s.talent_profile_id) || []);
    };
    fetchSaved();
  }, [user]);

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
    if (initialPartnerId) {
      loadThread(initialPartnerId);
    }
  }, [initialPartnerId]);

  const loadConversations = async () => {
    if (!user) return;
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
        convMap.set(partnerId, {
          partnerId, partnerName: p?.name || "Unknown", lastMessage: m.content, lastTime: m.created_at, unread: 0, partnerPhoto: p?.photo_url || null
        });
      }
      if (m.receiver_id === user.id && !m.is_read) convMap.get(partnerId)!.unread++;
    });
    setConversations(Array.from(convMap.values()));
    setLoading(false);
  };

  const loadThread = async (partnerId: string) => {
    if (!user) return;
    setSelectedPartner(partnerId);
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", partnerId).maybeSingle();
    setPartnerProfile(p);
    const { data } = await supabase.from("messages").select("*").or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
    setThread(data || []);
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", partnerId).eq("receiver_id", user.id);
  };

  const sendMessage = async () => {
    if (!user || !selectedPartner || !newMessage.trim()) return;
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: selectedPartner, content: newMessage.trim() });
    if (error) toast.error(error.message);
    else { setNewMessage(""); loadThread(selectedPartner); }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (!error) loadThread(selectedPartner!);
  };

  const handleFileUpload = async (e: any, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedPartner) return;
    setUploading(true);

    // Use auth.uid() as first folder segment to match RLS policy: (storage.foldername(name))[1] = auth.uid()::text
    const path = `${user.id}/messages/${Date.now()}.${file.name.split('.').pop()}`;

    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const content = type === 'image' ? `[IMAGE]:${publicUrl}` : `[FILE]:${file.name}|${publicUrl}`;

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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input placeholder="Search Active Chats" className="w-full bg-secondary/30 rounded-full pl-10 pr-4 py-2.5 text-sm text-white outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.map((c) => (
            <button key={c.partnerId} onClick={() => loadThread(c.partnerId)} className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-white/5 transition-all ${selectedPartner === c.partnerId ? "bg-white/5" : ""}`}>
              <div className="w-14 h-14 rounded-full bg-secondary border border-border/10 overflow-hidden flex items-center justify-center relative">
                {c.partnerPhoto ? <img src={c.partnerPhoto} className="w-full h-full object-cover" /> : <span className="text-xl text-primary">{c.partnerName[0]}</span>}
                {onlineUsers.has(c.partnerId) && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1c1c1c] rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[15px] text-white truncate">{c.partnerName}</div>
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
                  <p className="text-white text-sm mb-0.5">Upgrade for {isNepal ? "NPR 499" : "$4.99"}</p>
                  <p className="text-[0.65rem] text-muted-foreground uppercase">{isNepal ? "Unlock local & global limits" : "Go Global Pro"}</p>
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
            <MessageSquare size={64} className="text-primary/10 mx-auto" />
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-display">Cast your message worldwide</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <button className="md:hidden text-muted-foreground" onClick={() => setSelectedPartner(null)}>←</button>
                <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/10 relative">
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
                      <span className="text-[0.6rem] bg-white/5 text-muted-foreground px-1.5 py-0.5 rounded-md uppercase tracking-wider">Offline</span>
                    )}
                  </div>
                  <div className="text-[10px] text-primary/60 uppercase tracking-widest">Global Talent</div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar flex flex-col">
              {thread.map((m) => {
                const isMine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl overflow-hidden ${isMine ? "bg-primary text-black rounded-br-none" : "bg-white/5 text-white border border-white/10 rounded-bl-none"}`}>
                      {m.content.startsWith('[IMAGE]:') ? (
                        <div className="relative group">
                          <img
                            src={m.content.split(':')[1]}
                            className="w-full h-auto max-h-[400px] object-contain block"
                            style={{ imageRendering: 'auto' }}
                            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                          />
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-sm leading-relaxed">{m.content}</div>
                      )}
                    </div>
                    <div className="text-[9px] text-muted-foreground/40 uppercase tracking-widest px-2">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 flex items-center gap-3">
              <label className="p-2 hover:bg-white/5 rounded-full cursor-pointer"><ImageIcon size={20} className="text-primary" /><input type="file" hidden accept="image/*" onChange={e => handleFileUpload(e, 'image')} /></label>
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Send global message..." className="flex-1 bg-white/5 border-none rounded-full px-5 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary/20" />
              <button onClick={sendMessage} className="p-2.5 bg-primary text-black rounded-full hover:scale-110 active:scale-95 transition-all"><Send size={18} fill="currentColor" /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
