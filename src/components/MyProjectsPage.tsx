import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit3, FolderOpen, Layout, Clock, CheckCircle2, X, ImageIcon, Search, MapPin, DollarSign, Briefcase, Users, Eye, Check, UserPlus, Video, MessageSquare } from "lucide-react";
import { type Profile } from "@/services/profileService";

interface ProjectApplication extends Tables<"applications"> {
  projects?: {
    title: string;
    description: string;
    thumbnail_url: string;
    role_category: string;
    status: string;
  };
  profiles?: Partial<Profile> & { user_id: string };
}

type Project = Tables<"projects">;

export default function MyProjectsPage({ initialOpenForm, onProfileClick, onMessageClick }: { initialOpenForm?: boolean, onProfileClick: (p: Partial<Profile> & { user_id: string }) => void, onMessageClick: (uid: string) => void }) {
  const { user } = useAuth();
  const { confirm: confirmAction } = useConfirmation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"managed" | "applications">("managed");
  const [myApplications, setMyApplications] = useState<ProjectApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Pipeline State
  const [viewingApplicantsFor, setViewingApplicantsFor] = useState<Project | null>(null);
  const [applicants, setApplicants] = useState<ProjectApplication[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active",
    thumbnail_url: "",
    requirements: "",
    role_category: "Actor",
    location: "",
    salary_range: ""
  });

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load projects");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [user]);

  const fetchMyApplications = useCallback(async () => {
    if (!user) return;
    setAppsLoading(true);
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        projects:project_id (title, description, thumbnail_url, role_category, status)
      `)
      .eq('applicant_id', user.id);
    setMyApplications(data || []);
    setAppsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
    fetchMyApplications();
    if (initialOpenForm) {
      resetForm();
      setShowForm(true);
    }
  }, [user, fetchProjects, fetchMyApplications, initialOpenForm]);

  const respondToInvitation = async (appId: string, status: 'accepted' | 'rejected' | 'pending') => {
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', appId);

    if (error) {
      toast.error("Action failed");
    } else {
      toast.success(status === 'accepted' ? "Invitation Accepted!" : "Response recorded");
      fetchMyApplications();
    }
  };

  const fetchApplicants = async (project: Project) => {
    setApplicantsLoading(true);
    setViewingApplicantsFor(project);
    try {
      // 1. Fetch applications for this project
      const { data: appsData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('project_id', project.id);

      if (appError) throw appError;
      const apps = (appsData as any[]) || [];
      if (apps.length === 0) {
        setApplicants([]);
        return;
      }

      // 2. Fetch profiles for these applicants
      const applicantIds = apps.map(a => a.applicant_id);
      const { data: profs, error: profError } = await supabase
        .from('profiles')
        .select('id, name, photo_url, role, location, experience_years, user_id')
        .in('user_id', applicantIds);

      if (profError) throw profError;

      // 3. Merge data
      const merged = apps.map(app => ({
        ...app,
        profiles: profs?.find(p => p.user_id === app.applicant_id)
      }));

      setApplicants(merged);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not load applicants");
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Thumbnail too large (max 5MB)");
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image for the thumbnail");
      return;
    }

    // Show instant local preview while uploading
    const localPreview = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, thumbnail_url: localPreview }));

    try {
      toast.loading("Uploading thumbnail...");
      const fileExt = file.name.split('.').pop();
      // MUST start with user.id to pass RLS (first folder in array)
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      // Replace local blob with real public URL and clean up
      URL.revokeObjectURL(localPreview);
      setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.dismiss();
      toast.success("Thumbnail uploaded!");
    } catch (err: any) {
      // Keep the local preview so the UI doesn't blank out
      toast.dismiss();
      toast.error("Upload failed: " + err.message);
    }
  };

  const handleUpdateAudition = async (appId: string, file: File) => {
    if (!user) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video too large (max 50MB)");
      return;
    }
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      toast.error("Please upload a video or audio file for the audition");
      return;
    }

    try {
      toast.loading("Uploading new self-tape...");
      const fileExt = file.name.split('.').pop();
      // Ensure user.id is the first folder segment
      const filePath = `${user.id}/auditions/${appId}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('applications' as any).update({ video_url: publicUrl } as any).eq('id', appId);
      if (updateError) throw updateError;

      toast.dismiss();
      toast.success("Audition updated!");
      fetchMyApplications();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Upload failed");
    }
  };

  const updateApplicantStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', appId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      if (status === 'accepted') {
        const applicant = applicants.find(a => a.id === appId);
        toast.success(`Congratulations! You've hired ${applicant?.profiles?.name || 'the talent'}. You can now start messaging them.`, {
          duration: 5000,
        });
      } else {
        toast.success(`Applicant marked as ${status}`);
      }
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    }
  };

  const withdrawApplication = async (appId: string) => {
    confirmAction({
      title: "Withdraw Application",
      description: "Are you sure you want to withdraw this application? This action cannot be undone.",
      variant: "destructive",
      confirmLabel: "Withdraw",
      onConfirm: async () => {
        const { error } = await supabase
          .from('applications')
          .delete()
          .eq('id', appId);

        if (error) {
          toast.error("Withdrawal failed");
        } else {
          toast.success("Application withdrawn successfully");
          fetchMyApplications();
        }
      }
    });
  };

  const handleSave = async () => {
    if (!user || !formData.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    try {
      const projectPayload = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        thumbnail_url: formData.thumbnail_url,
        requirements: formData.requirements,
        role_category: formData.role_category,
        location: formData.location,
        salary_range: formData.salary_range
      };

      if (editId) {
        const { error } = await supabase
          .from("projects")
          .update(projectPayload as any)
          .eq("id", editId);

        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        const { error } = await supabase.from("projects").insert(projectPayload as any);

        if (error) throw error;
        toast.success("New casting call published!");
      }
      resetForm();
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const handleDelete = async (id: string) => {
    confirmAction({
      title: "Delete Project",
      description: "Are you sure you want to delete this project? All applications for this project will also be removed.",
      variant: "destructive",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) {
          console.error("Delete error:", error);
          toast.error(error.message);
        } else {
          toast.success("Project deleted successfully");
          fetchProjects();
        }
      }
    });
  };

  const startEdit = (p: Project) => {
    setEditId(p.id);
    setFormData({
      title: p.title,
      description: p.description || "",
      status: p.status || "active",
      thumbnail_url: p.thumbnail_url || "",
      requirements: p.requirements || "",
      role_category: p.role_category || "Actor",
      location: p.location || "",
      salary_range: p.salary_range || ""
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({
      title: "",
      description: "",
      status: "active",
      thumbnail_url: "",
      requirements: "",
      role_category: "Actor",
      location: "",
      salary_range: ""
    });
  };

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <motion.div
        className="max-w-[1000px] mx-auto px-4 py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display text-5xl text-primary mb-2 tracking-tight">Work Center</h1>
            <p className="text-muted-foreground text-sm font-body tracking-wide font-normal">Manage your casting calls and applications</p>
          </div>
          {activeTab === "managed" && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center justify-center gap-2 bg-primary text-black px-10 py-4 rounded-2xl font-normal text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
            >
              <Plus className="w-5 h-5" /> Launch New Project
            </button>
          )}
        </div>

        <div className="flex gap-4 mb-10 border-b border-border pb-px">
          <button
            onClick={() => setActiveTab("managed")}
            className={`px-6 py-4 text-xs font-normal uppercase tracking-widest transition-all relative ${activeTab === "managed" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            My Recruitment
            {activeTab === "managed" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-6 py-4 text-xs font-normal uppercase tracking-widest transition-all relative ${activeTab === "applications" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            My Job Applications
            {activeTab === "applications" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={activeTab === 'managed' ? "Search within your projects..." : "Search within your applications..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/50 backdrop-blur-md border-[1.5px] border-card-border rounded-2xl pl-12 pr-5 py-4 text-sm outline-none focus:border-primary transition-all shadow-inner"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="bg-card border-[1.5px] border-card-border rounded-[2.5rem] p-10 mb-12 shadow-2xl relative overflow-hidden"
            >
              {/* Form content remains same as before but refined */}
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-display text-3xl text-primary flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Layout className="text-primary w-6 h-6" />
                  </div>
                  {editId ? "Edit Project" : "New Casting Call"}
                </h3>
                <button onClick={resetForm} className="p-3 hover:bg-white/5 rounded-full transition-colors text-muted-foreground"><X size={24} /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Project Title</label>
                    <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Major Action Movie Lead" className="w-full bg-background/50 border-[1.5px] border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Project Thumbnail</label>
                    <div className="relative group cursor-pointer h-44 rounded-3xl border-2 border-dashed border-border overflow-hidden bg-background/30 hover:border-primary transition-all flex items-center justify-center">
                      {formData.thumbnail_url ? (
                        <img src={formData.thumbnail_url} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" alt="Preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary">
                          <ImageIcon size={32} />
                          <span className="text-[0.65rem] uppercase tracking-widest font-normal">Drop Image or Click</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleThumbnailUpload(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {formData.thumbnail_url && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Plus className="text-primary w-8 h-8" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Role Category</label>
                      <select value={formData.role_category} onChange={(e) => setFormData({ ...formData, role_category: e.target.value })} className="w-full bg-background/50 border-[1.5px] border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer">
                        <option value="Actor">Actor</option>
                        <option value="Director">Director</option>
                        <option value="Singer">Singer</option>
                        <option value="Dancer">Dancer</option>
                        <option value="Choreographer">Choreographer</option>
                        <option value="Producer">Producer</option>
                        <option value="Casting Director">Casting Director</option>
                        <option value="Screenwriter">Screenwriter</option>
                        <option value="Cinematographer">Cinematographer</option>
                        <option value="Composer">Composer</option>
                        <option value="Stunt Performer">Stunt Performer</option>
                        <option value="Voice Actor">Voice Actor</option>
                        <option value="Crew">Crew</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full bg-background/50 border-[1.5px] border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer">
                        <option value="active">🟢 Active</option>
                        <option value="draft">🟡 Draft</option>
                        <option value="completed">🔵 Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Location</label>
                      <input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" className="w-full bg-background/50 border-[1.5px] border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-all shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Salary / Budget</label>
                      <input value={formData.salary_range} onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })} placeholder="$ Range" className="w-full bg-background/50 border-[1.5px] border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[0.6rem] font-normal tracking-[3px] uppercase text-primary/60 ml-1">Brief Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What is this project about?" rows={3} className="w-full bg-background/50 border-[1.5px] border-border rounded-2xl px-5 py-4 text-foreground font-body text-sm outline-none focus:border-primary transition-all resize-none shadow-inner" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-6 mt-12 pt-10 border-t border-border/50">
                <button onClick={resetForm} className="px-8 py-4 rounded-2xl font-bold text-sm text-muted-foreground hover:text-foreground transition-colors">Discard</button>
                <button onClick={handleSave} className="bg-primary text-primary-foreground px-14 py-4 rounded-2xl font-bold text-xs uppercase tracking-[3px] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30">{editId ? "Update Project" : "Publish Project"}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {viewingApplicantsFor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[40] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-10 border-b border-border flex items-center justify-between bg-secondary/20">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Users className="text-primary w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-3xl text-white leading-none mb-2">{viewingApplicantsFor.title}</h3>
                      <p className="text-xs text-muted-foreground font-normal uppercase tracking-[2px]">Applicants Pipeline ({applicants.length})</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log("Closing pipeline");
                      setViewingApplicantsFor(null);
                    }}
                    className="p-4 hover:bg-white/5 rounded-full transition-colors text-muted-foreground relative z-50 pointer-events-auto"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-6">
                  {applicantsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <p className="text-xs font-normal tracking-[3px] uppercase text-muted-foreground">Accessing Project Database...</p>
                    </div>
                  ) : applicants.length === 0 ? (
                    <div className="text-center py-20">
                      <UserPlus className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
                      <p className="text-muted-foreground text-lg">No one has applied for this role yet.</p>
                    </div>
                  ) : (
                    applicants.map((a: ProjectApplication) => (
                      <div key={a.id} className="group bg-secondary/10 border border-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary/40 transition-all">
                        <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary overflow-hidden flex-shrink-0">
                          <img src={a.profiles?.photo_url || ""} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xl font-normal text-white mb-1">{a.profiles?.name}</div>
                          <div className="text-sm text-primary font-normal uppercase tracking-widest text-[0.7rem] mb-2">{a.profiles?.role}</div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>📍 {a.profiles?.location || 'Remote'}</span>
                            <span>⭐ {a.profiles?.experience_years}y Exp</span>
                          </div>
                          {a.video_url && (
                            <button
                              onClick={() => setPlayingVideo(a.video_url)}
                              className="mt-3 flex items-center gap-2 text-primary hover:underline text-xs font-normal uppercase tracking-wider"
                            >
                              <Video size={14} /> Watch Self-Tape Audition
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            value={a.status}
                            onChange={(e) => updateApplicantStatus(a.id, e.target.value)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-normal uppercase tracking-widest outline-none border transition-all cursor-pointer ${a.status === 'accepted' ? 'bg-green-500 text-black border-green-500' :
                              a.status === 'rejected' ? 'bg-red-500 text-white border-red-500' :
                                'bg-secondary border-border text-white'
                              }`}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="accepted">✅ Hired</option>
                            <option value="rejected">❌ Rejected</option>
                          </select>
                          <button
                            onClick={() => {
                              if (a.profiles?.user_id) {
                                onMessageClick(a.profiles.user_id);
                              } else {
                                toast.error("This actor hasn't fully set up their account.");
                              }
                            }}
                            className="p-4 bg-primary/20 text-primary rounded-xl hover:bg-primary hover:text-black transition-all shadow-xl shadow-primary/5 relative z-50 pointer-events-auto"
                            title="Direct Message"
                          >
                            <MessageSquare size={18} />
                          </button>
                          <button
                            onClick={() => {
                              console.log("Viewing profile:", a.profiles?.name);
                              if (a.profiles) {
                                onProfileClick(a.profiles);
                              } else {
                                toast.error("This actor hasn't set up their profile yet.");
                              }
                            }}
                            className="p-4 bg-white/5 text-muted-foreground rounded-xl hover:bg-white/10 transition-all relative z-50 pointer-events-auto"
                            title="Quick View"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading || appsLoading ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          activeTab === "managed" ? (
            filteredProjects.length === 0 ? (
              <div className="text-center py-32 bg-card/10 border-2 border-dashed border-border rounded-[3rem] shadow-inner">
                <FolderOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-8" />
                <p className="text-muted-foreground text-lg mb-2">No projects found.</p>
                <button onClick={() => setShowForm(true)} className="text-primary font-normal hover:underline">Launch your first casting call →</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProjects.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    className="bg-card border-[1.5px] border-card-border rounded-[2.5rem] overflow-hidden hover:border-primary/50 transition-all flex flex-col group shadow-lg"
                  >
                    <div className="aspect-[16/9] bg-secondary relative overflow-hidden">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/10">
                          <Layout className="w-24 h-24" />
                        </div>
                      )}
                      <div className="absolute top-6 left-6">
                        <span className={`px-4 py-2 rounded-full text-[0.65rem] font-normal uppercase tracking-[2px] backdrop-blur-xl border border-white/10 ${p.status === 'active' ? 'bg-primary text-black' :
                          p.status === 'completed' ? 'bg-blue-600 text-white' :
                            'bg-white/10 text-white'
                          }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="flex items-center gap-2 text-[0.6rem] font-bold tracking-[3px] text-primary uppercase mb-4 opacity-100">
                        <Briefcase size={12} /> {p.role_category} Search
                      </div>
                      <h4 className="font-display text-2xl text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">{p.title}</h4>
                      <p className="text-foreground/60 text-sm line-clamp-2 mb-8 h-10 leading-relaxed font-body italic">"{p.description}"</p>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEdit(p); }} 
                            className="p-3 bg-secondary/50 text-muted-foreground hover:bg-primary hover:text-black rounded-xl transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} 
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => fetchApplicants(p)}
                          className="bg-primary/10 text-primary border border-primary/20 px-6 py-3 rounded-xl text-[0.7rem] font-normal uppercase tracking-[2px] hover:bg-primary hover:text-black transition-all flex items-center gap-2 shadow-xl shadow-primary/5"
                        >
                          Review Pipeline <Users size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )) : (
            myApplications.length === 0 ? (
              <div className="text-center py-32 bg-card/10 border-2 border-dashed border-border rounded-[3rem] shadow-inner">
                <Layout className="w-16 h-16 text-muted-foreground/20 mx-auto mb-8" />
                <p className="text-muted-foreground text-lg mb-2">You haven't applied to any projects yet.</p>
                <p className="text-sm text-muted-foreground/50">Explore talents and projects to find opportunities!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {myApplications.filter(a => a.projects?.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((app) => (
                  <div key={app.id} className="bg-card border-[1.5px] border-card-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary transition-all">
                    <div className="w-20 h-20 rounded-2xl bg-secondary overflow-hidden flex-shrink-0">
                      {app.projects?.thumbnail_url ? (
                        <img src={app.projects.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/20"><Briefcase size={24} /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-display text-2xl text-foreground">{app.projects?.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-[0.6rem] font-bold uppercase tracking-widest ${app.status === 'accepted' ? 'bg-green-500 text-black' :
                          app.status === 'invited' ? 'bg-amber-500 text-black gold-glow animate-pulse' :
                            app.status === 'rejected' ? 'bg-red-500 text-white' :
                              'bg-secondary text-secondary-foreground'
                          }`}>
                          {app.status === 'invited' ? 'PROJECT INVITATION' : app.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/70 line-clamp-1 mb-3 font-medium">Looking for: {app.projects?.role_category} • Status: {app.projects?.status}</p>

                      {app.video_url ? (
                        <div className="flex items-center gap-4 mt-1 mb-4">
                          <button
                            onClick={() => setPlayingVideo(app.video_url)}
                            className="flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary px-4 py-2 rounded-xl text-xs hover:bg-primary/10 transition-all font-normal"
                          >
                            <Video size={14} /> Play My Audition
                          </button>
                          {app.status === 'pending' && (
                            <label className="text-[0.65rem] text-foreground/50 hover:text-primary cursor-pointer underline underline-offset-4 decoration-border transition-colors">
                              Change Audition
                              <input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpdateAudition(app.id, e.target.files[0])} />
                            </label>
                          )}
                        </div>
                      ) : (
                        app.status === 'pending' && (
                          <div className="mt-2 mb-4">
                            <label className="flex items-center gap-2 text-xs text-primary hover:text-primary/70 cursor-pointer transition-colors font-medium">
                              <Plus size={14} /> Add Self-Tape Audition
                              <input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpdateAudition(app.id, e.target.files[0])} />
                            </label>
                          </div>
                        )
                      )}

                      <div className="flex items-center gap-6 mt-1">
                        <p className="text-xs text-foreground/40 font-bold uppercase tracking-wider">Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                        {app.status === 'pending' && (
                          <button
                            onClick={() => withdrawApplication(app.id)}
                            className="text-[0.6rem] text-muted-foreground hover:text-red-500 font-bold uppercase tracking-widest transition-colors flex items-center gap-1 bg-foreground/5 px-3 py-1.5 rounded-full hover:bg-red-500/10"
                          >
                            <X size={12} /> Withdraw
                          </button>
                        )}
                      </div>
                    </div>

                    {app.status === 'invited' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToInvitation(app.id, 'accepted')}
                          className="bg-green-500 text-black px-6 py-3 rounded-xl text-xs font-normal uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-500/20"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToInvitation(app.id, 'rejected')}
                          className="bg-secondary border border-border text-white px-6 py-3 rounded-xl text-xs font-normal uppercase tracking-widest hover:border-red-500/50 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {app.status !== 'invited' && (
                      <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm italic opacity-50">
                          {app.status === 'pending' ? 'Application being reviewed...' : app.status === 'accepted' ? 'You were selected!' : 'Application closed'}
                        </div>
                        {app.status === 'pending' && (
                          <button
                            onClick={() => withdrawApplication(app.id)}
                            className="text-xs text-red-500 hover:text-red-400 font-normal uppercase tracking-widest px-4 py-2 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/10"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ))
        }
      </motion.div>

      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[2000] flex items-center justify-center p-4 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
              <video src={playingVideo} controls autoPlay className="w-full h-full" />
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all backdrop-blur-md"
              >
                <X size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
