import { Video, Clapperboard, Music, PersonStanding, Crown, Star, Film, Users, CheckCircle2, Briefcase, MapPin, Search, ChevronRight, UserPlus, Sparkles, UserCheck, Layout, Smartphone, Eye } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { profileService, type Profile } from "@/services/profileService";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageName } from "./AppDrawer";
import { TalentCardSkeleton } from "./SkeletonCards";

interface HomePageProps {
  onCategoryClick: (role: string) => void;
  onProfileClick: (profile: Partial<Profile> & { user_id: string }) => void;
  onTermsClick: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects"; openForm?: boolean }) => void;
  onlineUsers?: Set<string>;
  onOpenCastingTape?: () => void;
}

const categories = [
  { role: "Actor", icon: Video, delay: 0.1 },
  { role: "Director", icon: Clapperboard, delay: 0.2 },
  { role: "Singer", icon: Music, delay: 0.3 },
  { role: "Choreographer", icon: PersonStanding, delay: 0.4 },
  { role: "Producer", icon: Film, delay: 0.5 },
  { role: "Casting Director", icon: Users, delay: 0.6 },
];

export default function HomePage({ onCategoryClick, onProfileClick, onTermsClick, onNavigate, onlineUsers = new Set(), onOpenCastingTape }: HomePageProps) {
  const { profile: currentUserProfile, user } = useAuth();
  const [featured, setFeatured] = useState<Profile[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [statsData, setStatsData] = useState({ talents: "0", projects: "0", visits: "0", casts: "0" });
  const [doubleTapId, setDoubleTapId] = useState<string | null>(null);
  const [reelActiveId, setReelActiveId] = useState<string | null>(null);
  const reelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Mouse Parallax (#15)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["-5deg", "5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const moveXBack = useTransform(mouseXSpring, [-0.5, 0.5], [20, -20]);
  const moveYBack = useTransform(mouseYSpring, [-0.5, 0.5], [20, -20]);
  const moveXFront = useTransform(mouseXSpring, [-0.5, 0.5], [-30, 30]);
  const moveYFront = useTransform(mouseYSpring, [-0.5, 0.5], [-30, 30]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await profileService.getProProfiles();
        setFeatured(data.slice(0, 6));
      } catch (err) {
        console.error("Failed to load pro talents");
      }
    };
    const fetchRecentProjects = async () => {
      try {
        const data = await adminService.getRecentProjects(3);
        setRecentProjects(data);
      } catch (err) {
        console.error("Failed to load recent projects");
      }
    };
    const fetchStats = async () => {
      try {
        const stats = await profileService.getGlobalStats();
        setStatsData({
          talents: stats.talentsCount > 1000 ? `${(stats.talentsCount / 1000).toFixed(1)}k+` : stats.talentsCount.toString(),
          projects: stats.projectsCount > 1000 ? `${(stats.projectsCount / 1000).toFixed(1)}k+` : stats.projectsCount.toString(),
          visits: stats.viewsCount > 1000 ? `${(stats.viewsCount / 1000).toFixed(1)}k+` : stats.viewsCount.toString(),
          casts: stats.successCount > 1000 ? `${(stats.successCount / 1000).toFixed(1)}k+` : stats.successCount.toString()
        });
      } catch (err) {
        console.error("Failed to load global stats");
      }
    };
    fetchFeatured();
    fetchRecentProjects();
    fetchStats();
  }, [currentUserProfile?.role]);

  // Double-tap to save
  const handleDoubleTap = useCallback(async (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    if (!user) { toast.error("Sign in to save talent"); return; }
    const profileId = profile.id || profile.user_id;
    setDoubleTapId(profileId);
    try {
      await supabase.from("saved_talents").upsert(
        { user_id: user.id, talent_profile_id: profileId },
        { onConflict: "user_id,talent_profile_id" }
      );
      toast.success("Saved to your list!", { icon: "⭐" });
    } catch { /* ignore if already saved */ }
    setTimeout(() => setDoubleTapId(null), 800);
  }, [user]);

  // Reel preview on hover
  const handleReelEnter = useCallback((profileId: string) => {
    reelTimerRef.current = setTimeout(() => setReelActiveId(profileId), 1500);
  }, []);
  const handleReelLeave = useCallback(() => {
    if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
    setReelActiveId(null);
  }, []);

    const combinedHeroY = useTransform(
      [heroY, moveYBack],
      ([hy, my]) => Number(hy) + Number(my)
    );

    return (
      <div className="bg-transparent text-foreground selection:bg-primary/30 overflow-x-hidden">
        {/* ── HERO SECTION ── */}
        <section 
          ref={heroRef} 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative h-[92vh] flex items-center justify-center overflow-hidden perspective-1000"
        >
          {/* Background Layer */}
          <motion.div
            style={{ 
              scale: heroScale, 
              opacity: heroOpacity,
              x: moveXBack,
              y: combinedHeroY
            }}
            className="absolute inset-0 z-0 bg-transparent"
          >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10" />
          <img
            src="/hero-bg.png"
            alt="Cinematic Background"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80"; }}
          />
        </motion.div>

        {/* Content Layer */}
        <motion.div 
          style={{ 
            rotateX, 
            rotateY,
            x: moveXFront,
            y: moveYFront
          }}
          className="relative z-20 text-center px-6 max-w-5xl"
        >

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-accent text-[clamp(1.5rem,7vw,5.5rem)] leading-none tracking-[-0.08em] text-foreground mb-10 uppercase flex flex-col md:flex-row justify-center items-center gap-x-3 md:gap-x-6"
          >
            <span className="text-foreground font-black italic whitespace-nowrap">Casting</span> 
            <span className="text-foreground font-light whitespace-nowrap">for Actors & Creators</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-foreground/70 font-body max-w-2xl mx-auto mb-10 leading-relaxed font-light text-center"
          >
            Where directors meet talent. Find your role or cast your vision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex items-center justify-center"
          >
            <button
               onClick={() => onCategoryClick("post")}
               className="group relative px-10 py-4 bg-primary text-primary-foreground rounded-full font-accent font-bold text-[0.7rem] tracking-[0.2em] uppercase overflow-hidden transition-all duration-500 hover:scale-110 hover:gold-glow active:scale-95 shadow-[0_20px_50px_rgba(245,197,24,0.3)]"
             >
               <span className="relative z-10 flex items-center gap-2">Post a Casting Call <ChevronRight size={20} /></span>
               <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             </button>

             <button
               onClick={() => onOpenCastingTape?.()}
               className="group relative px-10 py-4 bg-secondary text-foreground rounded-full font-accent font-bold text-[0.7rem] tracking-[0.2em] uppercase overflow-hidden transition-all duration-500 hover:scale-110 hover:border-primary/50 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 border border-border/50"
             >
               <span className="relative z-10 flex items-center gap-2"><Video size={16} className="text-primary" /> Discovery Card</span>
             </button>
          </motion.div>

          {/* Role shortcut chips */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-8 px-6"
          >
            {["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"].map((role) => (
              <button
                key={role}
                onClick={() => onCategoryClick(role)}
                className="px-6 py-3 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/80 hover:bg-foreground/10 hover:border-foreground/50 hover:text-foreground text-[0.7rem] md:text-[0.75rem] font-bold uppercase tracking-[0.15em] transition-all duration-300 backdrop-blur-md shadow-2xl hover:scale-110 active:scale-95 whitespace-nowrap"
              >
                {role}
              </button>
            ))}
          </motion.div>
        </motion.div>

        {/* Floating Indicator */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-foreground/20"
        >
          <div className="w-px h-10 bg-gradient-to-b from-foreground/20 to-transparent" />
        </motion.div>
      </section>

      {/* ── GLASSMORPHIC STATS SECTION (#9) ── */}
      <section className="py-6 sm:py-8 px-8 max-w-7xl mx-auto relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "Talents Registered", value: statsData.talents, icon: Users, color: "text-primary" },
            { label: "Active Projects", value: statsData.projects, icon: Clapperboard, color: "text-amber-400" },
            { label: "Monthly Visits", value: statsData.visits, icon: Eye, color: "text-blue-400" },
            { label: "Successful Casts", value: statsData.casts, icon: Star, color: "text-orange-400" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-stat text-center space-y-3"
            >
              <div className={`w-10 h-10 mx-auto rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center ${stat.color}`}>
                <stat.icon size={18} className="animate-pulse" />
              </div>
              <div className="text-3xl md:text-4xl font-display text-foreground drop-shadow-sm">{stat.value}</div>
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-foreground/50 font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES (GLASSMORPHISM) ── */}
      <section className="py-2 md:py-4 px-6 max-w-7xl mx-auto relative z-30">
        <div className="text-center mb-6 md:mb-10 space-y-4 md:space-y-6">
          <h2 className="text-[0.65rem] md:text-[0.75rem] uppercase tracking-[0.5em] text-primary font-black">Select Your Discipline</h2>
          <h3 className="text-3xl md:text-5xl font-display text-foreground tracking-tight uppercase leading-none">The Global<br/><span className="italic text-foreground font-medium">Elite</span></h3>
          <div className="w-12 md:w-16 h-[2px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.role}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: cat.delay, duration: 0.6 }}
              className="group relative"
            >
              <div className="gradient-border-wrapper">
                <motion.div
                  onClick={() => onCategoryClick(cat.role)}
                  whileTap={{ scale: 0.96 }}
                  className="gradient-border-inner stitched-card relative z-10 h-44 md:h-56 rounded-3xl md:rounded-[2rem] p-4 md:p-8 flex flex-col items-center justify-between cursor-pointer hover-cinematic"
                >
                  <div className="shimmer-accent" />
                  <div className="stitched-card-scanner" />
                  <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-40 h-40 bg-primary/10 blur-[90px] rounded-full group-hover:bg-primary/20 transition-colors" />

                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] bg-foreground/5 border border-foreground/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-700">
                    <cat.icon className="w-7 h-7 md:w-9 md:h-9 text-primary/60 group-hover:text-primary" strokeWidth={1} />
                  </div>

                  <div className="text-center space-y-1 md:space-y-2 w-full px-4">
                    <span className="block font-display text-[0.9rem] md:text-lg lg:text-xl text-foreground tracking-tight uppercase font-bold truncate w-full">{cat.role}</span>
                    <span className="block text-[0.45rem] md:text-[0.6rem] uppercase tracking-[0.2em] md:tracking-[0.25em] text-foreground/60 group-hover:text-foreground transition-colors font-bold">Discover <ChevronRight className="inline-block w-2.5 h-2.5 ml-1" /></span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-4 md:py-6 px-8 md:px-12 max-w-7xl mx-auto relative z-30">
        <div className="bg-card border border-border rounded-[3.5rem] md:rounded-[4rem] p-8 md:p-14 overflow-hidden relative">
          {/* Abstract Background Glows */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* For Talents Track */}
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-primary">For Talent</span>
                <h3 className="text-4xl font-display text-foreground">Shine in the Spotlight</h3>
                <p className="text-sm text-foreground/70 font-light leading-relaxed max-w-md">Your gateway to the industry's most prestigious projects. Start your journey with three simple steps.</p>
              </div>

              <div className="space-y-10">
                {[
                  { icon: UserPlus, title: "Create Your ID", desc: "Build a professional portfolio that resonates with top casting directors." },
                  { icon: Sparkles, title: "Showcase Excellence", desc: "Upload your headshots, reels, and achievements to stand out from the crowd." },
                  { icon: Star, title: "Get Discovered", desc: "Apply for exclusive roles or let visionary directors find you directly." }
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="flex gap-6 group"
                  >
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-500">
                      <step.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2 pt-2">
                      <h4 className="text-lg font-display text-foreground group-hover:text-foreground/80 transition-colors uppercase tracking-widest">{step.title}</h4>
                      <p className="text-xs text-foreground/70 font-light leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* For Creatives Track */}
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-primary">For Directors</span>
                <h3 className="text-4xl font-display text-foreground">Vision Meets Talent</h3>
                <p className="text-sm text-foreground/70 font-light leading-relaxed max-w-md">Cast the perfect ensemble for your next masterpiece. Our network brings the world's best to you.</p>
              </div>

              <div className="space-y-10">
                {[
                  { icon: Search, title: "Discover Masters", desc: "Use precision search filters to find the exact talent your vision requires." },
                  { icon: UserCheck, title: "Review & Validate", desc: "Explore verified portfolios and high-definition reels in seconds." },
                  { icon: Briefcase, title: "Cast Your Stars", desc: "Connect directly and secure the talent that will bring your project to life." }
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="flex gap-6 group text-right lg:flex-row-reverse"
                  >
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-500">
                      <step.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2 pt-2">
                      <h4 className="text-lg font-display text-foreground group-hover:text-foreground/80 transition-colors uppercase tracking-widest">{step.title}</h4>
                      <p className="text-xs text-foreground/70 font-light leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED TALENTS ── */}
      {featured.length > 0 && (
        <section className="py-4 md:py-6 px-6 max-w-7xl mx-auto bg-secondary/10 rounded-[2.5rem] md:rounded-[4rem] border border-border relative z-30">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-6 md:mb-10 px-2 md:px-4">
            <div className="space-y-3 md:space-y-4 text-center md:text-left">
              <h2 className="text-[0.65rem] md:text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Wall of Excellence</h2>
              <h3 className="text-2xl md:text-3xl font-display text-foreground">Spotlight Performers</h3>
            </div>
            <button className="text-xs uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground border-b border-border pb-2 transition-colors">View Directory</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8 max-w-[900px] mx-auto w-full">
            {featured.map((p, i) => {
              const isElite = p.plan === 'pro' || p.role === 'Admin';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.96 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => onProfileClick(p)}
                  className={`group relative bg-card haptic-card border rounded-[1.5rem] p-5 flex flex-col items-center text-center cursor-pointer transition-all hover:-translate-y-2 ${isElite
                    ? "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-500/60"
                    : "border-border hover:border-primary/20"
                    }`}
                >
                  <div className="shimmer-accent" />
                  {/* Elite Shimmer Overlay */}
                  {isElite && (
                    <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent skew-x-12"
                      />
                    </div>
                  )}

                  <div
                    className={`relative w-20 h-20 rounded-full mb-4 p-1 bg-gradient-to-tr from-primary/10 to-transparent group-hover:from-primary/40 reel-preview-container ${reelActiveId === p.id ? 'reel-active' : ''}`}
                    onDoubleClick={(e) => handleDoubleTap(e, p)}
                    onMouseEnter={() => handleReelEnter(p.id)}
                    onMouseLeave={handleReelLeave}
                  >
                    <div className="w-full h-full rounded-full bg-secondary overflow-hidden shadow-2xl relative border-2 border-border">
                      {p.photo_url ? (
                        <img src={p.photo_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ken-burns" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-4xl text-primary/20">{p.name?.[0]}</div>
                      )}
                      {/* Reel video preview (#16) */}
                      {(p as any)?.videos?.[0] && (
                        <video
                          src={(p as any).videos[0]}
                          className="reel-video rounded-full"
                          muted
                          loop
                          playsInline
                          ref={(el) => { if (el && reelActiveId === p.id) el.play().catch(() => {}); else if (el) { el.pause(); el.currentTime = 0; } }}
                        />
                      )}
                    </div>
                    {/* Double-tap heart burst (#3) */}
                    {doubleTapId === p.id && <span className="heart-burst">⭐</span>}

                    {onlineUsers?.has(p.user_id) && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20">
                        <span className="live-badge">LIVE</span>
                      </div>
                    )}

                    {/* Elite Pulse for profile photo */}
                    {isElite && (
                      <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full animate-pulse pointer-events-none" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-display text-lg group-hover:text-foreground transition-colors ${isElite ? "text-foreground" : "text-foreground"}`}>{p.name}</h4>
                    {isElite && <Crown size={14} className="text-foreground shadow-[0_0_10px_rgba(0,0,0,0.2)]" />}
                    {p.is_verified && <CheckCircle2 size={14} className="text-blue-500" />}
                  </div>
                  <p className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] mb-4 ${isElite ? "text-foreground/80" : "text-foreground/60"}`}>{p.role === 'Admin' ? 'Member' : p.role}</p>
                  <p className="text-[0.65rem] text-foreground/70 line-clamp-2 h-9 mb-6 font-light italic leading-relaxed">"{p.bio || 'Professional talent available for casting calls.'}"</p>

                  <div className="w-full h-px bg-border mb-4" />
                  {/* Call Sheet mono metadata row */}
                  <div className="w-full flex items-center justify-between mb-4">
                    <span className="font-mono-tech">PROD#{p.id?.slice(0, 6).toUpperCase()}</span>
                    {p.experience_years != null && (
                      <span className="font-mono-tech">{p.experience_years}YR EXP</span>
                    )}
                    <span className="font-mono-tech">{p.location || 'REMOTE'}</span>
                  </div>
                  <span className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] transition-colors ${isElite ? "text-foreground/40 group-hover:text-foreground" : "text-foreground/40 group-hover:text-foreground"}`}>Portfolio</span>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CASTING CALLS ── */}
      {recentProjects.length > 0 && (
        <section className="py-4 md:py-6 px-6 max-w-7xl mx-auto relative z-30">
          <div className="text-center mb-6 md:mb-10 space-y-3 md:space-y-4">
            <h2 className="text-[0.65rem] md:text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Open Opportunities</h2>
            <h3 className="text-2xl md:text-3xl font-display text-foreground">Live Casting Calls</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {recentProjects.map((proj, i) => (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.96 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onCategoryClick(proj.role_category || 'Actor')}
                className="stitched-card group haptic-card relative h-auto rounded-2xl md:rounded-[1.2rem] p-3 md:p-5 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="shimmer-accent" />
                <div className="stitched-card-scanner" />
                <div className="relative aspect-[4/3] md:aspect-video rounded-xl overflow-hidden bg-secondary/50 mb-3 md:mb-8">
                  {proj.thumbnail_url ? (
                    <motion.img 
                      src={proj.thumbnail_url} 
                      className="w-full h-full object-cover ken-burns" 
                      alt="" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/10">
                      <Layout className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 md:top-4 md:left-4">
                    <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[0.45rem] md:text-[0.55rem] font-bold tracking-[0.15em] text-primary border border-primary/20">
                      {proj.location || 'Remote'}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-display text-sm md:text-lg text-foreground mb-2 md:mb-3 group-hover:text-foreground transition-all duration-300 line-clamp-1">{proj.title}</h4>
                  <p className="text-[0.6rem] md:text-xs text-foreground/70 mb-4 md:mb-10 font-light italic leading-relaxed">Looking for: <span className="text-primary font-medium">{proj.role_category}</span></p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[0.4rem] md:text-[0.5rem] uppercase tracking-widest text-primary/70">Comp.</span>
                    <span className="text-[0.5rem] md:text-[0.7rem] text-foreground font-bold tracking-widest uppercase">Competitive</span>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:text-background group-hover:border-foreground transition-all">
                    <ChevronRight size={14} className="md:w-[18px] md:h-[18px]" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── MISSION & VISION ── */}
      <section className="py-12 md:py-20 px-6 max-w-7xl mx-auto relative z-30 bg-card border border-border rounded-[3rem] my-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold italic">Our Soul</h2>
            <h3 className="text-5xl font-display text-foreground italic leading-tight">Empowering Every Story <br /> <span className="text-foreground/40 font-normal not-italic">to be Told</span></h3>
            <p className="text-sm text-foreground leading-relaxed font-light font-body max-w-md">
              CaastingCall was built with a single vision: to democratize the entertainment industry.
              Whether you're a child star in the making or a veteran director looking for your next leading man,
              we provide the tools to connect, showcase, and succeed.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-6">
              <div className="space-y-2">
                <span className="block text-2xl font-display text-foreground">Global Reach</span>
                <span className="text-[0.6rem] text-foreground/60 uppercase tracking-[0.2em]">Unlimited connections from any corner of the globe.</span>
              </div>
              <div className="space-y-2">
                <span className="block text-2xl font-display text-foreground">Trust First</span>
                <span className="text-[0.6rem] text-foreground/60 uppercase tracking-[0.2em]">Verified profiles and secure communications for peace of mind.</span>
              </div>
            </div>
          </div>
          <div className="relative aspect-square md:aspect-video rounded-[3rem] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-amber-500/20 z-10" />
            <img
              src="/vision-hero.png"
              alt="Vision"
              className="w-full h-full object-cover grayscale transition-transform duration-[2s] group-hover:scale-110 group-hover:grayscale-0"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80"; }}
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mt-12 border-t border-border py-16 relative z-30 bg-card/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 text-center md:text-left">
          <div className="col-span-2 md:col-span-2 space-y-8 text-center md:text-left mb-8 md:mb-0">
            <div className="flex justify-center md:justify-start">
              <h2 className="font-display text-3xl tracking-widest text-foreground hover:text-foreground/80 transition-all cursor-pointer uppercase italic">CaastingCall</h2>
            </div>
            <p className="text-[0.65rem] text-foreground uppercase tracking-[0.3em] font-medium italic max-w-sm mx-auto md:mx-0">
              The premium network for actors, creators, and visionary storytellers.
              Bridging the gap between raw talent and the global stage.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-[0.7rem] uppercase tracking-[0.4em] text-foreground font-bold">Platform</h4>
            <div className="flex flex-col gap-4 text-[0.6rem] uppercase tracking-[0.2em] font-bold text-foreground items-center md:items-start">
              <button onClick={() => onNavigate("search", { searchType: "projects" })} className="hover:text-foreground/70 transition-all">Casting Calls</button>
              <button onClick={() => onNavigate("search", { searchType: "talents" })} className="hover:text-foreground/70 transition-all">Find Talent</button>
              <button onClick={() => onNavigate("feed")} className="hover:text-foreground/70 transition-all">Community Feed</button>
              <button onClick={() => onNavigate("premium")} className="hover:text-foreground/70 transition-all">Upgrade to PRO</button>
              <a 
                href="/me.castingcall.app.apk" 
                download="CastingCall.apk" 
                className="group relative px-6 py-2 bg-primary/10 border border-primary/30 text-primary text-[0.6rem] uppercase tracking-[0.2em] font-bold rounded-xl hover:bg-primary hover:text-black transition-all duration-300"
              >
                Download App (Direct)
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[0.7rem] uppercase tracking-[0.4em] text-foreground font-bold">Company</h4>
            <div className="flex flex-col gap-4 text-[0.6rem] uppercase tracking-[0.2em] font-bold text-foreground items-center md:items-start">
              <button onClick={() => onNavigate("help")} className="hover:text-foreground/70 transition-all">About Us</button>
              <button onClick={() => onNavigate("help")} className="hover:text-foreground/70 transition-all">Contact Support</button>
              <button onClick={() => onNavigate("terms")} className="hover:text-foreground/70 transition-all">Terms of Service</button>
              <button onClick={() => onNavigate("terms")} className="hover:text-foreground/70 transition-all">Privacy Policy</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8 text-[0.6rem] uppercase tracking-[0.3em] font-bold text-muted-foreground/40">
            <a href="#" className="hover:text-foreground transition-colors">Instagram</a>
            <a href="#" className="hover:text-foreground transition-colors">Twitter (X)</a>
            <a href="#" className="hover:text-foreground transition-colors">YouTube</a>
          </div>
          <p className="text-[0.6rem] text-muted-foreground/20 uppercase tracking-[0.2em] md:tracking-[0.3em] whitespace-nowrap">© 2026 CaastingCall. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
