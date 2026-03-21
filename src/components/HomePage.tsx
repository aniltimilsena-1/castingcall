import { Video, Clapperboard, Music, PersonStanding, Crown, Star, Film, Users, CheckCircle2, Briefcase, MapPin, Search, ChevronRight, UserPlus, Sparkles, UserCheck, Layout } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { profileService, type Profile } from "@/services/profileService";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import { PageName } from "./AppDrawer";

interface HomePageProps {
  onCategoryClick: (role: string) => void;
  onProfileClick: (profile: Partial<Profile> & { user_id: string }) => void;
  onTermsClick: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects"; openForm?: boolean }) => void;
  onlineUsers?: Set<string>;
}

const categories = [
  { role: "Actor", icon: Video, delay: 0.1 },
  { role: "Director", icon: Clapperboard, delay: 0.2 },
  { role: "Singer", icon: Music, delay: 0.3 },
  { role: "Choreographer", icon: PersonStanding, delay: 0.4 },
  { role: "Producer", icon: Film, delay: 0.5 },
  { role: "Casting Director", icon: Users, delay: 0.6 },
];

export default function HomePage({ onCategoryClick, onProfileClick, onTermsClick, onNavigate, onlineUsers = new Set() }: HomePageProps) {
  const { profile: currentUserProfile } = useAuth();
  const [featured, setFeatured] = useState<Profile[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [statsData, setStatsData] = useState({ talents: "0", projects: "0", visits: "0", casts: "0" });
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await profileService.getFeaturedProfiles(currentUserProfile?.role === 'Admin');
        setFeatured(data.slice(0, 4));
      } catch (err) {
        console.error("Failed to load featured talents");
      }
    };
    const fetchRecentProjects = async () => {
      try {
        const data = await adminService.getAllAdminData();
        setRecentProjects(data.projects.slice(0, 3));
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

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden">
      {/* ── HERO SECTION ── */}
      <section ref={heroRef} className="relative h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background Layer */}
        <motion.div
          style={{ scale: heroScale, y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10" />
          <img
            src="/hero-bg.png"
            alt="Cinematic Background"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Content Layer */}
        <div className="relative z-20 text-center px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 flex justify-center"
          >
            <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-primary/50 via-amber-500/50 to-primary/50">
              <div className="bg-secondary rounded-full p-2 px-6 backdrop-blur-xl border border-border shadow-2xl">
                <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-amber-500">Premium Talent Network</span>
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-[clamp(1.8rem,4.5vw,3.5rem)] leading-[1.05] tracking-tighter text-white mb-6 uppercase"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-primary to-amber-500 italic font-normal">Casting</span> Opportunities <br />
            <span className="text-white/80">for Actors & Creators</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/70 font-body max-w-2xl mx-auto mb-10 leading-relaxed font-light"
          >
            Where directors meet talent. Find your role or cast your vision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <button
              onClick={() => onCategoryClick("all")}
              className="group relative px-10 py-4 bg-primary text-primary-foreground rounded-full font-display text-sm tracking-widest uppercase overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2 font-bold">Browse Auditions <ChevronRight size={16} /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <button
              onClick={() => onCategoryClick("post")}
              className="px-10 py-4 bg-secondary hover:bg-secondary/80 text-foreground border border-border backdrop-blur-md rounded-full font-display text-sm tracking-widest uppercase transition-all hover:border-primary/30"
            >
              Post a Casting Call
            </button>
          </motion.div>

          {/* Role shortcut chips */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-8"
          >
            <span className="text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground mr-1">Browse by role:</span>
            {["Actor", "Director", "Singer", "Choreographer", "Producer", "Casting Director"].map((role) => (
              <button
                key={role}
                onClick={() => onCategoryClick(role)}
                className="px-4 py-1.5 rounded-full bg-secondary/30 border border-border text-foreground/50 hover:bg-primary/15 hover:border-primary/40 hover:text-foreground text-[0.65rem] uppercase tracking-wider transition-all duration-200 backdrop-blur-sm"
              >
                {role}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Floating Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 text-foreground/20"
        >
          <div className="w-px h-16 bg-gradient-to-b from-foreground/20 to-transparent" />
        </motion.div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="py-20 px-8 max-w-7xl mx-auto border-y border-border relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: "Talents Registered", value: statsData.talents },
            { label: "Active Project", value: statsData.projects },
            { label: "Monthly Visits", value: statsData.visits },
            { label: "Successful Casts", value: statsData.casts },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="space-y-1"
            >
              <div className="text-3xl md:text-4xl font-display text-amber-500">{stat.value}</div>
              <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES (GLASSMORPHISM) ── */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative z-30">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Select Your Pillar</h2>
          <h3 className="text-4xl md:text-5xl font-display text-primary italic">Elite Talent Disciplines</h3>
          <div className="w-20 h-[2px] bg-primary/20 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.role}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: cat.delay, duration: 0.6 }}
              className="group relative"
            >
              <div
                onClick={() => onCategoryClick(cat.role)}
                className="relative z-10 h-72 bg-card border border-border rounded-[2.5rem] p-10 flex flex-col items-center justify-between cursor-pointer backdrop-blur-sm hover:border-primary transition-all duration-500 overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-40 h-40 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors" />

                <div className="w-16 h-16 rounded-3xl bg-secondary border border-border flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-500">
                  <cat.icon className="w-8 h-8 text-primary/80 group-hover:text-primary" strokeWidth={1.5} />
                </div>

                <div className="text-center space-y-2">
                  <span className="block font-display text-2xl text-foreground tracking-wide">{cat.role}</span>
                  <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Join the Ranks <ChevronRight className="inline-block w-3 h-3 ml-1" /></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-30">
        <div className="bg-card border border-border rounded-[4rem] p-12 md:p-20 overflow-hidden relative">
          {/* Abstract Background Glows */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* For Talents Track */}
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-amber-500/80">For Talent</span>
                <h3 className="text-4xl font-display text-foreground">Shine in the Spotlight</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-md">Your gateway to the industry's most prestigious projects. Start your journey with three simple steps.</p>
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
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500">
                      <step.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2 pt-2">
                      <h4 className="text-lg font-display text-foreground group-hover:text-amber-500 transition-colors uppercase tracking-widest">{step.title}</h4>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* For Creatives Track */}
            <div className="space-y-12">
              <div className="space-y-4">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-primary/80">For Directors</span>
                <h3 className="text-4xl font-display text-foreground">Vision Meets Talent</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-md">Cast the perfect ensemble for your next masterpiece. Our network brings the world's best to you.</p>
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
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500">
                      <step.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2 pt-2">
                      <h4 className="text-lg font-display text-foreground group-hover:text-primary transition-colors uppercase tracking-widest">{step.title}</h4>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">{step.desc}</p>
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
        <section className="py-32 px-6 max-w-7xl mx-auto bg-secondary/10 rounded-[4rem] border border-border relative z-30">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 px-4">
            <div className="space-y-4">
              <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-amber-500 font-bold">Wall of Excellence</h2>
              <h3 className="text-4xl md:text-5xl font-display text-amber-600 dark:text-amber-500">Spotlight Performers</h3>
            </div>
            <button className="text-xs uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary border-b border-border pb-2 transition-colors">View Directory</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {featured.map((p, i) => {
              const isElite = p.plan === 'pro' || p.role === 'Admin';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => onProfileClick(p)}
                  className={`group relative bg-card border rounded-[2rem] p-8 flex flex-col items-center text-center cursor-pointer transition-all hover:-translate-y-2 ${isElite
                    ? "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-500/60"
                    : "border-border hover:border-primary/20"
                    }`}
                >
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

                  <div className="relative w-28 h-28 rounded-full mb-6 p-1 bg-gradient-to-tr from-primary/10 to-transparent group-hover:from-primary/40">
                    <div className={`w-full h-full rounded-full bg-secondary overflow-hidden shadow-2xl relative border-2 border-border`}>
                      {p.photo_url ? (
                        <img src={p.photo_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-4xl text-primary/20">{p.name?.[0]}</div>
                      )}

                      {/* Elite Pulse for profile photo */}
                      {isElite && (
                        <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full animate-pulse" />
                      )}

                    {onlineUsers.has(p.user_id) && (
                      <div className="absolute inset-0 border-2 border-primary/20 rounded-full shadow-[inset_0_0_10px_rgba(34,197,94,0.2)]" />
                    )}
                  </div>
                  {onlineUsers.has(p.user_id) && (
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-border rounded-full z-10 shadow-glow shadow-green-500/50" />
                  )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <h4 className={`font-display text-lg group-hover:text-primary transition-colors ${isElite ? "text-amber-500" : "text-foreground"}`}>{p.name}</h4>
                    {isElite && <Crown size={14} className="text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
                    {p.is_verified && <CheckCircle2 size={14} className="text-blue-500" />}
                  </div>
                  <p className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] mb-6 ${isElite ? "text-amber-500/80" : "text-primary/60"}`}>{p.role}</p>
                  <p className="text-[0.7rem] text-muted-foreground line-clamp-2 h-10 mb-8 font-light italic leading-relaxed">"{p.bio || 'Professional talent available for casting calls.'}"</p>

                  <div className="w-full h-px bg-border mb-6" />
                  <span className={`text-[0.6rem] font-bold uppercase tracking-[0.2em] transition-colors ${isElite ? "text-amber-500/40 group-hover:text-amber-500" : "text-muted-foreground group-hover:text-foreground"}`}>Portfolio</span>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CASTING CALLS ── */}
      {recentProjects.length > 0 && (
        <section className="py-32 px-6 max-w-7xl mx-auto relative z-30">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Open Opportunities</h2>
            <h3 className="text-4xl md:text-5xl font-display text-primary">Live Casting Calls</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recentProjects.map((proj, i) => (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onCategoryClick(proj.role_category || 'Actor')}
                className="group relative h-full bg-card border border-border rounded-[2rem] p-10 hover:border-primary transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-secondary/50 mb-8">
                  {proj.thumbnail_url ? (
                    <img src={proj.thumbnail_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/10">
                      <Layout className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[0.55rem] font-bold tracking-[0.2em] text-white/50 border border-white/5">
                      {proj.location || 'Remote'}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-display text-2xl text-primary mb-4 group-hover:text-primary transition-all duration-300">{proj.title}</h4>
                  <p className="text-xs text-muted-foreground mb-10 font-light italic leading-relaxed">Looking for: {proj.role_category}</p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[0.5rem] uppercase tracking-widest text-muted-foreground/50">Compensation</span>
                    <span className="text-[0.7rem] text-amber-500 font-bold tracking-widest uppercase">Competitive</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── MISSION & VISION ── */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative z-30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold italic">Our Soul</h2>
            <h3 className="text-5xl font-display text-primary italic leading-tight">Empowering Every Story <br /> <span className="text-primary/40 font-normal not-italic">to be Told</span></h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-light font-body max-w-md">
              CaastingCall was built with a single vision: to democratize the entertainment industry.
              Whether you're a child star in the making or a veteran director looking for your next leading man,
              we provide the tools to connect, showcase, and succeed.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-6">
              <div className="space-y-2">
                <span className="block text-2xl font-display text-amber-500">Global Reach</span>
                <span className="text-[0.6rem] text-muted-foreground/60 uppercase tracking-[0.2em]">Unlimited connections from any corner of the globe.</span>
              </div>
              <div className="space-y-2">
                <span className="block text-2xl font-display text-primary">Trust First</span>
                <span className="text-[0.6rem] text-muted-foreground/60 uppercase tracking-[0.2em]">Verified profiles and secure communications for peace of mind.</span>
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
      <footer className="mt-20 border-t border-border py-24 relative z-30 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
          <div className="md:col-span-2 space-y-8">
            <div className="flex justify-center md:justify-start">
              <h2 className="font-display text-3xl tracking-widest text-primary hover:text-primary/80 transition-all cursor-pointer uppercase italic">CaastingCall</h2>
            </div>
            <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.3em] font-medium italic max-w-sm mx-auto md:mx-0">
              The premium network for actors, creators, and visionary storytellers.
              Bridging the gap between raw talent and the global stage.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Platform</h4>
            <div className="flex flex-col gap-4 text-[0.6rem] uppercase tracking-[0.2em] font-bold text-muted-foreground">
              <button onClick={() => onNavigate("search", { searchType: "projects" })} className="hover:text-primary transition-all text-left">Casting Calls</button>
              <button onClick={() => onNavigate("search", { searchType: "talents" })} className="hover:text-primary transition-all text-left">Find Talent</button>
              <button onClick={() => onNavigate("feed")} className="hover:text-primary transition-all text-left">Community Feed</button>
              <button onClick={() => onNavigate("premium")} className="hover:text-primary transition-all text-left">Upgrade to PRO</button>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[0.7rem] uppercase tracking-[0.4em] text-amber-500 font-bold">Company</h4>
            <div className="flex flex-col gap-4 text-[0.6rem] uppercase tracking-[0.2em] font-bold text-muted-foreground">
              <button onClick={() => onNavigate("help")} className="hover:text-amber-500 transition-all text-left">About Us</button>
              <button onClick={() => onNavigate("help")} className="hover:text-amber-500 transition-all text-left">Contact Support</button>
              <button onClick={() => onNavigate("terms")} className="hover:text-amber-500 transition-all text-left">Terms of Service</button>
              <button onClick={() => onNavigate("terms")} className="hover:text-amber-500 transition-all text-left">Privacy Policy</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8 text-[0.6rem] uppercase tracking-[0.3em] font-bold text-muted-foreground/40">
            <a href="#" className="hover:text-foreground transition-colors">Instagram</a>
            <a href="#" className="hover:text-foreground transition-colors">Twitter (X)</a>
            <a href="#" className="hover:text-foreground transition-colors">YouTube</a>
          </div>
          <p className="text-[0.6rem] text-muted-foreground/20 uppercase tracking-[0.3em]">© 2026 CaastingCall. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
