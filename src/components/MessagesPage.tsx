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
  Crown
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
  reactions?: Record<string, string[]>; // emoji -> [user_ids]
  reply_content?: string; // transient for UI
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
}

export default function MessagesPage({ onNavigate }: MessagesPageProps) {
  const { user, profile: currentUserProfile } = useAuth();
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

  // Advanced Features State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const EMOJIS = [
    "😀", "😂", "🤣", "😍", "🥰", "😘",
    "😎", "🤩", "🥳", "😏", "🤔", "🙄",
    "🔥", "💯", "✨", "💫", "⭐", "🎉",
    "👍", "👎", "❤️", "💖", "💙", "✅",
    "🙌", "🙏", "👏", "💪", "🌈", "🎈"
  ];

  useEffect(() => {
    if (!user) return;
    loadConversations();

    const fetchSaved = async () => {
      const { data } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
      setSavedTalentIds(data?.map(s => s.talent_profile_id) || []);
    };
    fetchSaved();
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

  const loadConversations = async () => {
    if (!user) return;
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!messages) {
      setLoading(false);
      return;
    }

    const partnerIds = new Set<string>();
    messages.forEach((m) => {
      partnerIds.add(m.sender_id === user.id ? m.receiver_id : m.sender_id);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, photo_url")
      .in("user_id", Array.from(partnerIds));

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const convMap = new Map<string, Conversation>();
    messages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap.has(partnerId)) {
        const p = profileMap.get(partnerId);
        convMap.set(partnerId, {
          partnerId,
          partnerName: p?.name || "Unknown",
          lastMessage: m.content,
          lastTime: m.created_at,
          unread: 0,
          partnerPhoto: p?.photo_url || null
        });
      }
      if (m.receiver_id === user.id && !m.is_read) {
        convMap.get(partnerId)!.unread++;
      }
    });

    setConversations(Array.from(convMap.values()));
    setLoading(false);
  };

  const loadThread = async (partnerId: string) => {
    if (!user) return;
    setSelectedPartner(partnerId);

    // Fetch partner profile for header/avatars
    const { data: p } = await supabase.from("profiles").select("*").eq("user_id", partnerId).maybeSingle();
    setPartnerProfile(p);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setThread(data || []);

    // mark as read
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", partnerId).eq("receiver_id", user.id);
  };

  const sendMessage = async () => {
    if (!user || !selectedPartner) {
      console.error("Missing user or partner:", { user, selectedPartner });
      return;
    }

    let contentToSend = newMessage.trim();
    if (!contentToSend) {
      if (editingMessage) {
        toast.error("Cannot save empty message");
        return;
      }
      contentToSend = "👍";
    }

    // Store references for potential rollback
    const prevThread = [...thread];
    const originalEditingMessage = editingMessage;
    const originalReplyingTo = replyingTo;
    const originalMessage = newMessage;

    try {
      // CLEAR UI EARLY: This makes the "Send" feel instant
      setNewMessage("");
      setReplyingTo(null);
      setEditingMessage(null);

      if (originalEditingMessage) {
        // Optimistic Thread Update
        setThread(prev => prev.map(m => m.id === originalEditingMessage.id ? { ...m, content: contentToSend, is_edited: true } : m));

        const { error } = await supabase
          .from("messages")
          .update({ content: contentToSend, is_edited: true } as any)
          .eq("id", originalEditingMessage.id);

        if (error) throw error;
        toast.success("Message updated");
      } else {
        const { error } = await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: selectedPartner,
          content: contentToSend,
          reply_to_id: originalReplyingTo?.id || null
        } as any);

        if (error) throw error;
      }

      loadThread(selectedPartner);
    } catch (err: any) {
      console.error("Sanding (Sending) Error:", err);
      // ROLLBACK on error
      setThread(prevThread);
      setNewMessage(originalMessage);
      setEditingMessage(originalEditingMessage);
      setReplyingTo(originalReplyingTo);

      if (err.message?.includes("column") || err.message?.includes("permission") || err.code === "PGRST204") {
        toast.error("DATABASE FIX REQUIRED: Please run the SQL migration script in your Supabase SQL Editor for Edits/Replies to work.");
      } else {
        toast.error(err.message || "Failed to send message");
      }
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) toast.error(error.message);
    else {
      toast.success("Message deleted");
      if (selectedPartner) loadThread(selectedPartner);
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    const msg = thread.find(m => m.id === messageId);
    if (!msg || !user) return;

    const currentReactions = { ...(msg.reactions || {}) };
    const userIds = (currentReactions as any)[emoji] || [];

    // Optimistic Update
    let newUsers = [...userIds];
    if (userIds.includes(user.id)) {
      newUsers = userIds.filter((id: string) => id !== user.id);
      if (newUsers.length === 0) delete (currentReactions as any)[emoji];
      else (currentReactions as any)[emoji] = newUsers;
    } else {
      newUsers = [...userIds, user.id];
      (currentReactions as any)[emoji] = newUsers;
    }

    // Apply immediate local update
    setThread(prev => prev.map(m => m.id === messageId ? { ...m, reactions: currentReactions } : m));

    const { error } = await supabase
      .from("messages")
      .update({ reactions: currentReactions } as any)
      .eq("id", messageId);

    if (error) {
      console.error("Reaction Error:", error);
      toast.error("Database mismatch: You MUST run the SQL migration in Supabase for Reactions to work.");
      // Rollback on error
      loadThread(selectedPartner!);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedPartner) return;

    try {
      setUploading(true);
      toast.loading(`Uploading ${type}...`);

      const fileExt = file.name.split('.').pop();
      const filePath = `messages/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const content = type === 'image' ? `[IMAGE]:${publicUrl}` : `[FILE]:${file.name}|${publicUrl}`;

      const { error: sendError } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedPartner,
        content: content,
      });

      if (sendError) throw sendError;

      toast.dismiss();
      toast.success(`${type === 'image' ? 'Image' : 'File'} sent!`);
      loadThread(selectedPartner);
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div className="max-w-[1250px] mx-auto px-4 py-4 md:py-6 h-[calc(100dvh-116px)] sm:h-[calc(100dvh-64px)] flex gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Sidebar - Chats List */}
      <div className={`${selectedPartner ? "hidden md:flex" : "flex"} w-full md:w-[350px] bg-[#1c1c1c] border border-border/20 rounded-3xl overflow-hidden flex-col shadow-xl gold-glow`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h1 className="text-2xl font-normal text-white">Chats</h1>
            <div className="flex gap-2">
            </div>
          </div>

          <div className="relative group px-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search Message"
              className="w-full bg-secondary/30 border-none rounded-full pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary/40 transition-all font-body"
            />
          </div>

          <div className="flex gap-2 px-1 overflow-x-auto no-scrollbar pb-1">
            {['All', 'Unread'].map((tab) => (
              <button key={tab} className={`px-5 py-2 rounded-full text-xs font-normal transition-all whitespace-nowrap ${tab === 'All' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-white/70 hover:bg-secondary/50'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-secondary/20 rounded-xl animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic text-sm">No conversations found.</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.partnerId}
                onClick={() => loadThread(c.partnerId)}
                className={`w-full px-3 py-3 mx-2 rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 group ${selectedPartner === c.partnerId ? "bg-white/5" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-secondary border border-border/10 flex items-center justify-center overflow-hidden">
                    {c.partnerPhoto ? (
                      <img src={c.partnerPhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-xl font-display text-primary">{c.partnerName[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  {/* Active Status Dot */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#31a24c] border-4 border-[#1c1c1c] rounded-full" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center">
                    <div className={`font-normal text-[15px] truncate ${c.unread > 0 ? "text-white" : "text-white/90"}`}>
                      {c.partnerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`text-[13px] truncate flex-1 ${c.unread > 0 ? "font-normal text-white" : "text-muted-foreground"}`}>
                      {c.lastMessage}
                    </div>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                      · {new Date(c.lastTime).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                {c.unread > 0 ? (
                  <div className="w-3 h-3 bg-[#0084ff] rounded-full mr-2" />
                ) : (
                  <div className="w-4 h-4 rounded-full overflow-hidden opacity-50 mr-2">
                    {c.partnerPhoto && <img src={c.partnerPhoto} className="w-full h-full object-cover" />}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {currentUserProfile?.plan !== 'pro' && (
          <div className="p-4 mt-auto border-t border-white/5">
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 blur-3xl rounded-full -mr-10 -mt-10" />
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Crown className="text-black w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-normal text-sm mb-0.5">Upgrade for NPR 499</p>
                  <p className="text-[0.65rem] text-muted-foreground font-medium">Unlock Unlimited Messages & Advanced Analytics</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate?.("premium")}
                className="w-full bg-[#60bb46] text-white py-2.5 rounded-xl text-[0.65rem] font-normal uppercase tracking-[2px] hover:scale-105 transition-all shadow-xl shadow-[#60bb46]/20 relative z-10 flex items-center justify-center gap-2"
              >
                <img src="/esewa.png" className="h-4 w-auto object-contain" alt="" />
                Pay via eSewa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area - Distinct Box */}
      <div className={`flex-1 flex flex-col bg-[#1c1c1c] border border-border/20 rounded-3xl overflow-hidden shadow-xl gold-glow ${!selectedPartner ? "hidden md:flex items-center justify-center" : "flex"}`}>
        {!selectedPartner ? (
          <div className="text-center p-8 space-y-2">
            <MessageSquare size={64} className="text-primary/10 mx-auto" strokeWidth={1} />
            <p className="text-muted-foreground text-sm font-body tracking-wide">Select a chat to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-border/20">
              <div className="flex items-center gap-3">
                {/* Back button — mobile only */}
                <button
                  className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setSelectedPartner(null)}
                  aria-label="Back to conversations"
                >
                  ←
                </button>
                <div
                  className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border/10 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  onClick={() => setShowPartnerProfile(true)}
                >
                  {partnerProfile?.photo_url ? (
                    <img src={partnerProfile.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-display">{partnerProfile?.name?.[0]}</div>
                  )}
                </div>
                <div className="cursor-pointer" onClick={() => setShowPartnerProfile(true)}>
                  <div className="font-normal text-base text-white leading-tight hover:underline">{partnerProfile?.name}</div>
                  <div className="text-[12px] text-muted-foreground">Active now</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-primary">
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar custom-scrollbar flex flex-col">
              {thread.map((m, idx) => {
                const isMine = m.sender_id === user?.id;
                const senderPhoto = isMine ? currentUserProfile?.photo_url : partnerProfile?.photo_url;
                const nextIsSame = thread[idx + 1]?.sender_id === m.sender_id;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-1 mb-2 ${isMine ? "items-end" : "items-start"}`}
                  >
                    {/* Timestamp display on click */}
                    <AnimatePresence>
                      {selectedMessageId === m.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-[10px] text-muted-foreground/60 font-normal mb-1 px-10"
                        >
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className={`flex gap-2 items-end max-w-[85%] group ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar */}
                      {!isMine ? (
                        <div
                          className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 overflow-hidden mb-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setShowPartnerProfile(true)}
                        >
                          {!nextIsSame && (
                            senderPhoto ? (
                              <img src={senderPhoto} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[0.6rem] font-normal text-primary">
                                {partnerProfile?.name?.[0]}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="w-7" />
                      )}

                      <div className="flex flex-col relative">
                        {/* Reply Preview in thread */}
                        {m.reply_to_id && (() => {
                          const repliedMsg = thread.find(t => t.id === m.reply_to_id);
                          return (
                            <div className={`text-[11px] opacity-70 mb-1 px-3 py-2 bg-white/5 rounded-t-xl border-l-[3px] border-primary/50 flex flex-col gap-0.5 max-w-[250px] ${isMine ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-1.5 font-normal text-primary/80">
                                <Reply size={10} />
                                <span>{repliedMsg?.sender_id === user?.id ? "You" : partnerProfile?.name}</span>
                              </div>
                              <div className="truncate w-full italic opacity-60 text-[10px]">
                                {repliedMsg?.content.startsWith('[IMAGE]:') ? '📷 Photo' :
                                  repliedMsg?.content.startsWith('[FILE]:') ? '📎 Attachment' :
                                    repliedMsg?.content || "Original message unavailable"}
                              </div>
                            </div>
                          );
                        })()}

                        <div
                          onClick={() => setSelectedMessageId(selectedMessageId === m.id ? null : m.id)}
                          className={`flex flex-col cursor-pointer transition-all ${isMine ? "items-end" : "items-start"}`}
                        >
                          {m.content.startsWith('[IMAGE]:') ? (
                            <div className="max-w-[300px] rounded-2xl overflow-hidden border border-border/20 shadow-lg gold-glow">
                              <img src={m.content.replace('[IMAGE]:', '')} alt="Sent" className="w-full h-auto object-cover" />
                            </div>
                          ) : m.content.startsWith('[FILE]:') ? (
                            <a
                              href={m.content.split('|')[1]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/20 hover:bg-white/5 transition-all max-w-[280px] ${isMine ? 'bg-primary text-black' : 'bg-secondary text-white'}`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMine ? 'bg-black/10' : 'bg-primary/20'}`}>
                                <PlusCircle size={20} className={isMine ? 'text-black' : 'text-primary'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[0.7rem] font-normal uppercase tracking-wider truncate mb-0.5">Attachment</p>
                                <p className="text-[0.65rem] opacity-60 truncate">{m.content.split('|')[0].replace('[FILE]:', '')}</p>
                              </div>
                            </a>
                          ) : (
                            <div className={`max-w-[480px] px-4 py-2 text-[15px] leading-relaxed relative ${isMine
                              ? "bg-primary text-black font-medium rounded-2xl rounded-br-none"
                              : "bg-secondary/60 text-white rounded-2xl rounded-bl-none border border-white/5"
                              }`}>
                              {m.content}
                              {m.is_edited && <span className="text-[9px] opacity-40 ml-2">(edited)</span>}
                            </div>
                          )}
                        </div>

                        {/* Reactions bar */}
                        {m.reactions && Object.keys(m.reactions).length > 0 && (
                          <div className={`flex gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                            {Object.entries(m.reactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => reactToMessage(m.id, emoji)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-normal transition-all ${(users as string[]).includes(user?.id || '') ? 'bg-primary/20 border border-primary/30 text-primary' : 'bg-secondary/80 border border-white/5 text-white/70'}`}
                              >
                                <span>{emoji}</span>
                                {(users as string[]).length > 1 && <span>{(users as string[]).length}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons on click */}
                      <AnimatePresence>
                        {selectedMessageId === m.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: isMine ? -10 : 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex gap-0.5 items-center bg-[#252525] border border-white/10 rounded-full px-1.5 py-1 shadow-2xl z-20 mb-2 ${isMine ? "mr-2" : "ml-2"}`}
                          >
                            {/* Mini Reaction Picker on Hover */}
                            <div className="flex gap-0.5 mr-1 pr-1 border-r border-white/10" onClick={(e) => e.stopPropagation()}>
                              {["❤️", "😂", "👍"].map(emoji => (
                                <button key={emoji} onClick={(e) => { e.stopPropagation(); reactToMessage(m.id, emoji); }} className="p-1 hover:scale-125 transition-transform text-[14px]">{emoji}</button>
                              ))}
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); setReplyingTo(m); setSelectedMessageId(null); }} className="p-1.5 hover:text-primary transition-colors text-white/70" title="Reply"><Reply size={14} /></button>
                            {isMine && (
                              <>
                                {!m.content.startsWith('[IMAGE]:') && !m.content.startsWith('[FILE]:') && (
                                  <button onClick={(e) => { e.stopPropagation(); setEditingMessage(m); setNewMessage(m.content); setSelectedMessageId(null); }} className="p-1.5 hover:text-primary transition-colors text-white/70" title="Edit"><Edit3 size={14} /></button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); deleteMessage(m.id); setSelectedMessageId(null); }} className="p-1.5 hover:text-red-500 transition-colors text-white/70" title="Delete"><Trash2 size={14} /></button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center justify-between bg-white/5 border-l-4 border-primary px-4 py-2 rounded-lg mb-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-normal text-primary uppercase tracking-widest">Replying to</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {replyingTo.content.startsWith('[IMAGE]:') ? '📷 Photo' :
                          replyingTo.content.startsWith('[FILE]:') ? '📎 Attachment' :
                            replyingTo.content}
                      </p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={14} /></button>
                  </motion.div>
                )}
                {editingMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center justify-between bg-primary/10 border-l-4 border-primary px-4 py-2 rounded-lg mb-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-normal text-primary uppercase tracking-widest">Editing Message</p>
                      <p className="text-xs text-muted-foreground truncate">{editingMessage.content}</p>
                    </div>
                    <button onClick={() => { setEditingMessage(null); setNewMessage(""); }} className="p-1 hover:bg-white/10 rounded-full"><X size={14} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-primary">
                  <input type="file" id="plus-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />
                  <input type="file" id="image-upload" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />

                  <label htmlFor="plus-upload" className="p-2 hover:bg-white/5 rounded-full cursor-pointer transition-all active:scale-95">
                    <PlusCircle size={22} />
                  </label>
                  <label htmlFor="image-upload" className="p-2 hover:bg-white/5 rounded-full cursor-pointer transition-all active:scale-95">
                    <ImageIcon size={22} />
                  </label>
                </div>
                <div className="flex-1 relative">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={editingMessage ? "Edit your message..." : replyingTo ? "Type a reply..." : "Aa"}
                    className="w-full bg-secondary/40 border-none rounded-full px-4 py-2.5 text-sm text-white outline-none font-body"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Smile size={20} />
                    </button>

                    <AnimatePresence>
                      {showEmojiPicker && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowEmojiPicker(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 shadow-2xl gold-glow z-50 min-w-[280px]"
                          >
                            <div className="text-[0.65rem] font-normal text-primary/50 tracking-[2px] uppercase mb-4 px-2">Choose Reaction</div>
                            <div className="grid grid-cols-6 gap-3">
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewMessage(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="group relative p-2 transition-all hover:scale-150 active:scale-90"
                                >
                                  <span className="text-2xl relative z-10">{emoji}</span>
                                  <div className="absolute inset-0 bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <button
                  onClick={sendMessage}
                  className="p-2 text-primary hover:scale-110 active:scale-95 transition-all"
                >
                  {editingMessage ? (
                    <Check size={26} className="text-green-500" />
                  ) : newMessage.trim() ? (
                    <Send size={24} fill="currentColor" />
                  ) : (
                    <ThumbsUp size={24} fill="currentColor" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ProfileDetailDialog
        profile={partnerProfile}
        open={showPartnerProfile}
        onOpenChange={setShowPartnerProfile}
        user={user}
        currentUserProfile={currentUserProfile}
        isSaved={partnerProfile ? savedTalentIds.includes(partnerProfile.user_id) : false}
        onToggleSave={toggleSave}
      />
    </motion.div>
  );
}
