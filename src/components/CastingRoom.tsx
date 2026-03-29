import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, MessageSquare, Send, Eye, ShieldCheck, Crown, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";
import { type Profile } from "@/services/profileService";

interface CastingRoomProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  onViewProfile: (profile: any) => void;
  applicants: any[];
}

interface RoomMember {
  user_id: string;
  name: string;
  photo_url: string;
  role: string;
  is_host: boolean;
}

export default function CastingRoom({ projectId, projectTitle, onClose, onViewProfile, applicants }: CastingRoomProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<{user: string, text: string, time: string}[]>([]);
  const [inputText, setInputText] = useState("");
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !projectId) return;

    // 1. Initialize Realtime Channel
    const channel = supabase.channel(`casting-room:${projectId}`, {
      config: {
        presence: { key: user.id },
      },
    });

    // 2. Presence tracking
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const memberList = Object.values(state).flat().map((p: any) => ({
          user_id: p.user_id,
          name: p.user_name || "Anonymous",
          photo_url: p.photo_url || "",
          role: p.role || "Director",
          is_host: p.is_host || false
        }));
        setMembers(memberList);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        toast.info(`${newPresences[0].user_name || 'Someone'} joined the room`, { icon: "👋" });
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        // toast.info(`${leftPresences[0].user_name || 'Someone'} left the room`);
      });

    // 3. Broadcast handling (Syncing profile view & chat)
    channel
      .on("broadcast", { event: "sync_profile" }, ({ payload }) => {
        setActiveProfileId(payload.profileId);
        const talent = applicants.find(a => a.profiles?.user_id === payload.profileId);
        if (talent && talent.profiles) {
          toast(`Reviewing: ${talent.profiles.name}`, { icon: "👀" });
          // Optionally auto-open the profile for others if requested
          // onViewProfile(talent.profiles); 
        }
      })
      .on("broadcast", { event: "chat_msg" }, ({ payload }) => {
        setMessages(prev => [...prev, { user: payload.user, text: payload.text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
      });

    // 4. Subscribe
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "Director",
          photo_url: "", // In a real app we'd fetch this
          is_host: true, // Simplified for now
          role: "Casting Director"
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId, applicants]);

  const sendSyncProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    channelRef.current?.send({
      type: "broadcast",
      event: "sync_profile",
      payload: { profileId }
    });
    const talent = applicants.find(a => a.profiles?.user_id === profileId);
    if (talent) onViewProfile(talent.profiles);
  };

  const sendChat = () => {
    if (!inputText.trim()) return;
    const msg = { user: user?.email?.split("@")[0] || "User", text: inputText };
    channelRef.current?.send({
      type: "broadcast",
      event: "chat_msg",
      payload: msg
    });
    setMessages(prev => [...prev, { ...msg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setInputText("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col md:flex-row overflow-hidden"
    >
      {/* ── LEFTBAR: TALENT PIPELINE ── */}
      <div className="w-full md:w-80 border-r border-white/10 bg-black/40 flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="text-primary w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[3px] text-primary">Live Pipeline</span>
          </div>
          <button onClick={onClose} className="md:hidden text-muted-foreground"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {applicants.map(a => (
            <button
              key={a.id}
              onClick={() => sendSyncProfile(a.profiles?.user_id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                activeProfileId === a.profiles?.user_id 
                ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(245,197,24,0.15)]' 
                : 'bg-white/5 border-transparent hover:border-white/20'
              }`}
            >
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden bg-secondary">
                <img src={a.profiles?.photo_url} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-white truncate">{a.profiles?.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{a.profiles?.role}</div>
              </div>
              {activeProfileId === a.profiles?.user_id && <Eye size={14} className="text-primary animate-pulse" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── CENTRAL: ACTIVE VIEW ── */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <div className="h-20 border-b border-white/10 px-8 flex items-center justify-between bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col">
              <h2 className="text-lg font-display text-white">{projectTitle}</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Collaborative Room • {members.length} Online</span>
              </div>
            </div>
            {/* Presence Avatars */}
            <div className="flex -space-x-2 ml-4">
              {members.slice(0, 5).map(m => (
                <div key={m.user_id} className="w-8 h-8 rounded-full border-2 border-black bg-secondary flex items-center justify-center text-[10px] text-white font-bold" title={m.name}>
                  {m.name[0]}
                </div>
              ))}
              {members.length > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[10px] text-white">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            Leave Room
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-12 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeProfileId ? (
              <motion.div 
                key={activeProfileId}
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full h-full flex items-center justify-center pointer-events-none opacity-40"
              >
                <div className="text-center">
                  <div className="w-40 h-40 rounded-full border-4 border-primary mx-auto mb-6 overflow-hidden">
                    <img src={applicants.find(a => a.profiles?.user_id === activeProfileId)?.profiles?.photo_url} className="w-full h-full object-cover" alt="" />
                  </div>
                  <h3 className="text-4xl font-display text-white mb-2">{applicants.find(a => a.profiles?.user_id === activeProfileId)?.profiles?.name}</h3>
                  <div className="text-primary font-accent font-bold uppercase tracking-[5px] text-sm">Reviewing Talent Details</div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center max-w-sm">
                <Users size={64} className="text-muted-foreground/20 mx-auto mb-6" />
                <h4 className="text-xl font-display text-white/50 mb-2">Room Synchronized</h4>
                <p className="text-sm text-white/30 font-body">Select a talent from the left pipeline to sync everyone's view for collective reviewing.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHTBAR: ROOM CHAT ── */}
      <div className="w-full md:w-80 border-l border-white/10 bg-black/40 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <MessageSquare size={18} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-[3px] text-white">Live Discussion</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.user === user?.email?.split("@")[0] ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{m.user}</span>
                <span className="text-[9px] text-muted-foreground/50">{m.time}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[85%] font-body ${
                m.user === user?.email?.split("@")[0] 
                ? 'bg-primary text-primary-foreground font-medium rounded-tr-none' 
                : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
              <MessageSquare size={32} className="mb-4" />
              <p className="text-xs font-body">Type a message to start the casting discussion</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-white/10 bg-black/60">
          <div className="relative flex items-center">
            <input 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Room discussion..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-xs text-white outline-none focus:border-primary/50"
            />
            <button 
              onClick={sendChat}
              className="absolute right-2 p-2 text-primary hover:text-white transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
