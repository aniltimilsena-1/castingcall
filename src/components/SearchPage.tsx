import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bookmark, Send, Edit2, Trash2, Heart, MessageCircle, X, PersonStanding, Clapperboard, Layout, MapPin, DollarSign, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDetailDialog from "./ProfileDetailDialog";

type Profile = Tables<"profiles">;

interface SearchPageProps {
  query?: string;
  role?: string;
  onBack: () => void;
  onProfileClick: (profile: Profile) => void;
}

export default function SearchPage({ query, role, onBack, onProfileClick }: SearchPageProps) {
  const { user, profile: currentUserProfile } = useAuth();
  const [searchType, setSearchType] = useState<"talents" | "projects">("talents");
  const [results, setResults] = useState<Profile[]>([]);
  const [projectResults, setProjectResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedTalentIds, setSavedTalentIds] = useState<string[]>([]);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      if (searchType === "talents") {
        let q = supabase.from("profiles").select("*").order('plan', { ascending: false });
        if (role) {
          q = q.eq("role", role);
        } else if (query) {
          q = q.or(`name.ilike.%${query}%,role.ilike.%${query}%,bio.ilike.%${query}%`);
        }
        const { data } = await q;
        setResults(data || []);
      } else {
        let q = supabase.from("projects").select("*").eq("status", "active");
        if (query) {
          q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,requirements.ilike.%${query}%`);
        }
        const { data } = await q;
        setProjectResults(data || []);
      }
      setLoading(false);
    };
    search();

    if (user) {
      const fetchSaved = async () => {
        const { data } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
        setSavedTalentIds(data?.map(s => s.talent_profile_id) || []);
      };
      fetchSaved();
    }
  }, [query, role, user, searchType]);

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

  const title = role ? `${role}s` : `Search Results for "${query || 'All'}"`;

  return (
    <motion.div
      className="max-w-[1000px] mx-auto px-6 md:px-4 py-12"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <button
          onClick={onBack}
          className="inline-block border-[1.5px] border-border rounded-xl text-muted-foreground px-5 py-2.5 font-bold text-sm hover:border-primary hover:text-primary transition-all self-start"
        >
          ← Back
        </button>
        <div className="flex bg-secondary/50 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-inner self-center md:self-auto">
          <button
            onClick={() => setSearchType("talents")}
            className={`px-8 py-3 rounded-xl text-[0.7rem] font-black uppercase tracking-[2px] transition-all duration-300 ${searchType === "talents" ? "bg-primary text-black shadow-2xl shadow-primary/20 scale-105" : "text-muted-foreground hover:text-white"}`}
          >
            Talents
          </button>
          <button
            onClick={() => setSearchType("projects")}
            className={`px-8 py-3 rounded-xl text-[0.7rem] font-black uppercase tracking-[2px] transition-all duration-300 ${searchType === "projects" ? "bg-primary text-black shadow-2xl shadow-primary/20 scale-105" : "text-muted-foreground hover:text-white"}`}
          >
            Casting Calls
          </button>
        </div>
      </div>

      <h2 className="font-display text-5xl text-primary mb-12 tracking-tight">
        {searchType === 'talents' ? title : `Open Casting Calls`}
      </h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-[0.65rem] font-black tracking-[4px] uppercase animate-pulse">Syncing Database...</p>
        </div>
      ) : searchType === "talents" ? (
        results.length === 0 ? (
          <div className="text-center py-32 bg-card/30 border-2 border-dashed border-border rounded-[3rem] shadow-inner">
            <PersonStanding className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-muted-foreground font-body text-lg">No matching talent profiles found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((p) => (
              <div
                key={p.id}
                onClick={() => onProfileClick(p)}
                className="group relative flex flex-col md:flex-row md:items-center gap-4 bg-card border-[1.5px] border-card-border rounded-2xl px-4 md:px-6 py-4 md:py-5 hover:border-primary/50 hover:shadow-[0_20px_50px_-15px_rgba(251,191,36,0.15)] transition-all cursor-pointer overflow-hidden transform-gpu hover:-translate-y-1"
              >
                <div className="flex flex-col items-center gap-3 flex-shrink-0 relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-secondary border-[3px] border-primary flex items-center justify-center font-display text-2xl text-primary overflow-hidden shadow-lg transition-transform duration-500 group-hover:scale-110">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      (p.name || "U")[0].toUpperCase()
                    )}
                  </div>
                  {p.plan === "pro" && (
                    <div className="absolute -bottom-2 bg-primary text-black text-[0.55rem] font-black px-3 py-1 rounded-full shadow-lg tracking-tighter">PREMIUM</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-base md:text-lg font-medium text-foreground group-hover:text-primary transition-colors tracking-tight truncate flex items-center gap-2">
                      {p.name || "Unknown"}
                      {p.plan === "pro" && <Crown size={14} className="text-amber-500 fill-amber-500/20" />}
                    </div>
                  </div>
                  <div className="text-primary font-semibold text-xs mb-2 md:mb-3 tracking-wide uppercase opacity-80">{p.role || "Member"}</div>
                  <div className="flex flex-wrap gap-4 md:gap-8">
                    {p.location && <span className="text-sm text-muted-foreground flex items-center gap-2.5 font-medium tracking-wide">📍 {p.location}</span>}
                    {p.experience_years !== null && <span className="text-sm text-muted-foreground flex items-center gap-2.5 font-medium tracking-wide">⭐ {p.experience_years}y Exp</span>}
                  </div>
                  {p.bio && <p className="text-sm text-muted-foreground/50 line-clamp-1 mt-4 md:mt-5 italic font-body">"{p.bio}"</p>}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-auto mt-2 md:mt-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => toggleSave(e, p.id)}
                    className={`p-2 md:p-3 rounded-xl border transition-all ${savedTalentIds.includes(p.id) ? 'bg-primary/20 border-primary text-primary shadow-xl shadow-primary/10' : 'bg-secondary/40 border-border text-muted-foreground hover:border-primary/50'}`}
                  >
                    <Bookmark size={20} fill={savedTalentIds.includes(p.id) ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => onProfileClick(p)}
                    className="bg-primary text-primary-foreground px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs font-bold uppercase tracking-[1px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        projectResults.length === 0 ? (
          <div className="text-center py-32 bg-card/30 border-2 border-dashed border-border rounded-[3rem] shadow-inner">
            <Clapperboard className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-muted-foreground font-body text-lg">No open casting calls found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {projectResults.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )
      )}

    </motion.div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const { user } = useAuth();
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && project.id) {
      const checkApplied = async () => {
        const { data } = await supabase.from('applications' as any).select('id').eq('project_id', project.id).eq('applicant_id', user.id).maybeSingle();
        if (data) setApplied(true);
      };
      checkApplied();
    }
  }, [user, project.id]);

  const handleApply = async () => {
    if (!user) {
      toast.error("Sign in to apply for casting calls");
      return;
    }
    if (applied) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('applications' as any).insert({
        project_id: project.id,
        applicant_id: user.id,
        status: 'pending'
      });
      if (error) throw error;
      setApplied(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-card border-[1.5px] border-card-border rounded-[3rem] overflow-hidden group hover:border-primary/50 transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-primary/5 relative transform-gpu hover:-translate-y-2"
    >
      <div className="aspect-[16/10] bg-secondary relative overflow-hidden">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/10">
            <Layout className="w-24 h-24" />
          </div>
        )}
        <div className="absolute top-6 left-6 flex gap-2">
          <div className="bg-primary/90 backdrop-blur-md text-black px-5 py-2.5 rounded-full text-[0.7rem] font-black uppercase tracking-[2px] shadow-2xl border border-white/10">
            {project.role_category || 'Talent'} Call
          </div>
          {applied && (
            <div className="bg-green-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-[0.7rem] font-black uppercase tracking-[2px] shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
              Applied
            </div>
          )}
        </div>
      </div>
      <div className="p-10">
        <h4 className="font-display text-3xl text-white mb-4 group-hover:text-primary transition-colors leading-tight">{project.title}</h4>
        <div className="flex flex-wrap items-center gap-6 text-[0.65rem] text-muted-foreground mb-8 font-black uppercase tracking-[2px]">
          <span className="flex items-center gap-2.5"><MapPin size={16} className="text-primary" /> {project.location || 'Remote'}</span>
          <span className="flex items-center gap-2.5"><DollarSign size={16} className="text-primary" /> {project.salary_range || 'Competitive'}</span>
        </div>
        <p className="text-sm text-muted-foreground/60 line-clamp-2 mb-8 leading-relaxed font-body">
          {project.description || "No detailed description provided for this casting call."}
        </p>
        <button
          onClick={handleApply}
          disabled={applied || loading}
          className={`w-full py-5 rounded-2xl text-[0.7rem] font-black uppercase tracking-[3px] transition-all shadow-xl ${applied
            ? 'bg-green-500/10 text-green-500 border-2 border-green-500/20 cursor-default'
            : 'bg-secondary/80 backdrop-blur-sm border-2 border-border group-hover:border-primary/50 text-white hover:bg-primary hover:text-black hover:border-primary'
            }`}
        >
          {loading ? 'Submitting...' : applied ? 'Application Sent' : 'Apply for this role'}
        </button>
      </div>
    </motion.div>
  );
}

export function PhotoViewer({ url, onClose, user, currentUserProfile, photoOwnerId }: {
  url: string | null;
  onClose: () => void;
  user: any;
  currentUserProfile: any;
  photoOwnerId?: string;
}) {
  const [likes, setLikes] = useState<number>(0);
  const [userLiked, setUserLiked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number, userLiked: boolean }>>({});
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    if (url) {
      fetchEngagement();
    }
  }, [url]);

  const fetchEngagement = async () => {
    if (!url) return;

    try {
      const { count: likeCount } = await supabase
        .from('photo_likes')
        .select('*', { count: 'exact', head: true })
        .eq('photo_url', url);
      setLikes(likeCount || 0);

      if (user) {
        const { data: myLike } = await supabase
          .from('photo_likes')
          .select('*')
          .eq('photo_url', url)
          .eq('user_id', user.id)
          .maybeSingle();
        setUserLiked(!!myLike);
      }

      const { data: comms, error: commsError } = await supabase
        .from('photo_comments')
        .select(`
          *,
          profiles:user_id (name, photo_url)
        `)
        .eq('photo_url', url)
        .order('created_at', { ascending: false });

      if (commsError) {
        const { data: simpleComms } = await supabase
          .from('photo_comments')
          .select('*')
          .eq('photo_url', url)
          .order('created_at', { ascending: false });
        setComments(simpleComms || []);
      } else {
        setComments(comms || []);
        if (comms && comms.length > 0) {
          const commentIds = comms.map(c => c.id);
          const { data: allLikes } = await supabase
            .from('photo_comment_likes' as any)
            .select('comment_id, user_id')
            .in('comment_id', commentIds);

          const likesMap: Record<string, { count: number, userLiked: boolean }> = {};
          commentIds.forEach(id => {
            const fans = (allLikes as any[])?.filter(l => l.comment_id === id) || [];
            likesMap[id] = {
              count: fans.length,
              userLiked: user ? fans.some(f => f.user_id === user.id) : false
            };
          });
          setCommentLikes(likesMap);
        }
      }

      const { data: captionData } = await supabase
        .from('photo_captions')
        .select('description, user_id')
        .eq('photo_url', url)
        .maybeSingle();
      setDescription(captionData?.description || null);

      const ownerIdToFetch = photoOwnerId || (captionData as any)?.user_id;
      if (ownerIdToFetch) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('name, photo_url, role')
          .eq('user_id', ownerIdToFetch)
          .maybeSingle();
        setOwner(ownerData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async () => {
    if (!user || !url) return;
    if (userLiked) {
      await supabase.from('photo_likes').delete().eq('photo_url', url).eq('user_id', user.id);
      setUserLiked(false);
      setLikes(prev => prev - 1);
    } else {
      await supabase.from('photo_likes').insert({ photo_url: url, user_id: user.id });
      setUserLiked(true);
      setLikes(prev => prev + 1);
    }
  };

  const submitComment = async () => {
    if (!user || !url || !newComment.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('photo_comments').insert({
      photo_url: url,
      user_id: user.id,
      content: newComment.trim(),
      parent_id: replyTo?.id || null
    });
    if (!error) {
      setNewComment("");
      setReplyTo(null);
      await fetchEngagement();
    }
    setLoading(false);
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from('photo_comments').delete().eq('id', id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateComment = async (id: string) => {
    if (!editingContent.trim()) return;
    await supabase.from('photo_comments').update({ content: editingContent.trim() }).eq('id', id);
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: editingContent.trim() } : c));
    setEditingCommentId(null);
  };

  const handleLikeComment = async (id: string) => {
    if (!user) return;
    const current = commentLikes[id] || { count: 0, userLiked: false };
    const isLiking = !current.userLiked;
    setCommentLikes(prev => ({
      ...prev,
      [id]: {
        count: isLiking ? (prev[id]?.count || 0) + 1 : Math.max(0, (prev[id]?.count || 0) - 1),
        userLiked: isLiking
      }
    }));
    if (isLiking) {
      await supabase.from('photo_comment_likes' as any).insert({ comment_id: id, user_id: user.id });
    } else {
      await supabase.from('photo_comment_likes' as any).delete().eq('comment_id', id).eq('user_id', user.id);
    }
  };

  const handleReply = (comment: any) => {
    const parentId = comment.parent_id || comment.id;
    setReplyTo({ id: parentId, name: comment.profiles?.name || 'User' });
    document.getElementById('comment-input')?.focus();
  };

  const renderComment = (c: any, isReply = false) => (
    <div key={c.id} className={`flex gap-3 ${isReply ? 'ml-10 mt-3 border-l-2 border-border pl-4' : 'mt-6'}`}>
      <div className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0`}>
        {c.profiles?.photo_url ? (
          <img src={c.profiles.photo_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-primary">{c.profiles?.name?.[0] || 'U'}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold text-white">{c.profiles?.name}</div>
          <div className="text-[0.65rem] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
        </div>

        {editingCommentId === c.id ? (
          <div className="space-y-2">
            <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="w-full bg-secondary border border-primary/20 rounded-lg px-3 py-2 text-sm text-foreground outline-none" rows={2} />
            <div className="flex gap-2">
              <button onClick={() => handleUpdateComment(c.id)} className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-bold">Save</button>
              <button onClick={() => setEditingCommentId(null)} className="text-muted-foreground hover:text-white px-3 py-1 text-xs font-bold">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground leading-relaxed italic">"{c.content}"</div>
        )}

        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => handleLikeComment(c.id)} className={`flex items-center gap-1 text-[0.65rem] font-bold transition-colors ${commentLikes[c.id]?.userLiked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <Heart size={12} fill={commentLikes[c.id]?.userLiked ? "currentColor" : "none"} />
            {commentLikes[c.id]?.count || 0}
          </button>
          {!isReply && <button onClick={() => handleReply(c)} className="text-[0.65rem] font-bold text-muted-foreground hover:text-primary">Reply</button>}

          {user && user.id === c.user_id && (
            <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingCommentId(c.id); setEditingContent(c.content); }} className="text-muted-foreground hover:text-primary transition-colors"><Edit2 size={12} /></button>
              <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={!!url} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90svh] p-0 bg-background border-none flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-3xl">
        <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
          <img src={url || ""} className="max-w-full max-h-full object-contain" alt="Post" />
          <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all"><X size={20} /></button>
        </div>

        <div className="w-full md:w-[400px] bg-card flex flex-col h-full border-l border-border">
          <div className="p-6 border-b border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary border border-primary flex items-center justify-center font-display text-xl text-primary overflow-hidden">
              {owner?.photo_url ? <img src={owner.photo_url} className="w-full h-full object-cover" alt="" /> : (owner?.name?.[0] || '?')}
            </div>
            <div>
              <div className="font-bold text-lg text-white leading-none mb-1">{owner?.name || "Member"}</div>
              <div className="text-xs text-primary font-body uppercase tracking-wider">{owner?.role || "Talent"}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {description && <div className="text-sm text-muted-foreground leading-relaxed mb-8 italic border-l-2 border-primary/20 pl-4">{description}</div>}

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button onClick={handleLike} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${userLiked ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground hover:border-primary/50"}`}>
                  <Heart size={18} fill={userLiked ? "currentColor" : "none"} />
                  <span className="font-bold text-sm">{likes}</span>
                </button>
              </div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{comments.length} Comments</div>
            </div>

            <div className="space-y-6 flex-1">
              {comments.filter(c => !c.parent_id).map((c) => (
                <div key={c.id} className="group">
                  {renderComment(c)}
                  {comments.filter(r => r.parent_id === c.id).map(r => renderComment(r, true))}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-card/80 backdrop-blur-sm">
            {replyTo && (
              <div className="mb-3 flex items-center justify-between bg-primary/10 px-3 py-1.5 rounded text-xs text-primary font-bold">
                <span>Replying to {replyTo.name}</span>
                <button onClick={() => setReplyTo(null)} className="text-primary hover:text-white transition-colors"><X size={14} /></button>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                id="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-all resize-none h-[42px] scrollbar-hide"
              />
              <button
                onClick={submitComment}
                disabled={loading || !newComment.trim()}
                className="bg-primary text-primary-foreground p-2 px-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
