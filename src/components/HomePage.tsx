import { Video, Clapperboard, Music, PersonStanding, Crown, Star, Film, Users, CheckCircle2, Briefcase, MapPin, Search, ChevronRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { profileService } from "@/services/profileService";
import { adminService } from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";

interface HomePageProps {
  onCategoryClick: (role: string) => void;
  onProfileClick: (profile: any) => void;
  onTermsClick: () => void;
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

export default function HomePage({ onCategoryClick, onProfileClick, onTermsClick, onlineUsers = new Set() }: HomePageProps) {
  const { profile: currentUserProfile } = useAuth();
  const [featured, setFeatured] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
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
    fetchFeatured();
    fetchRecentProjects();
  }, [currentUserProfile?.role]);

  return (
    <div className="min-h-screen bg-[#070708] text-foreground selection:bg-primary/30 overflow-x-hidden">
      {/* ── HERO SECTION ── */}
      <section ref={heroRef} className="relative h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background Layer */}
        <motion.div
          style={{ scale: heroScale, y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#070708] z-10" />
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
              <div className="bg-[#070708] rounded-full p-2 px-6 backdrop-blur-xl border border-white/5 shadow-2xl">
                <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-amber-500">Premium Talent Network</span>
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.9] tracking-tighter text-white mb-6"
          >
            DISCOVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-primary to-amber-500 italic">LIMITLESS</span> POSSIBILITIES
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/50 font-body max-w-2xl mx-auto mb-10 leading-relaxed font-light"
          >
            The global stage for exceptional performers and visionary creators.
            Join the most elite community in the entertainment industry.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <button
              onClick={() => onCategoryClick("Actor")}
              className="group relative px-10 py-4 bg-primary text-black rounded-full font-display text-sm tracking-widest uppercase overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2 font-bold">Start Exploring <ChevronRight size={16} /></span>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <button
              className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md rounded-full font-display text-sm tracking-widest uppercase transition-all hover:border-white/20"
            >
              Learn More
            </button>
          </motion.div>
        </div>

        {/* Floating Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 text-white/20"
        >
          <div className="w-px h-16 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="py-20 px-8 max-w-7xl mx-auto border-y border-white/5 relative z-30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: "Talents Registered", value: "25k+" },
            { label: "Active Project", value: "1.2k+" },
            { label: "Monthly Visits", value: "480k" },
            { label: "Successful Casts", value: "8k+" },
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
              <div className="text-[0.6rem] uppercase tracking-[0.2em] text-white/30 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES (GLASSMORPHISM) ── */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative z-30">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Select Your Pillar</h2>
          <h3 className="text-4xl md:text-5xl font-display text-white italic">Elite Talent Disciplines</h3>
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
                className="relative z-10 h-72 bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-between cursor-pointer backdrop-blur-sm group-hover:bg-white/[0.06] group-hover:border-primary/30 transition-all duration-500 overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-40 h-40 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors" />

                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-500">
                  <cat.icon className="w-8 h-8 text-primary/80 group-hover:text-primary" strokeWidth={1.5} />
                </div>

                <div className="text-center space-y-2">
                  <span className="block font-display text-2xl text-white/90 tracking-wide">{cat.role}</span>
                  <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-white/30 group-hover:text-primary/60 transition-colors">Join the Ranks <ChevronRight className="inline-block w-3 h-3 ml-1" /></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURED TALENTS ── */}
      {featured.length > 0 && (
        <section className="py-32 px-6 max-w-7xl mx-auto bg-white/[0.01] rounded-[4rem] border border-white/5 relative z-30">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 px-4">
            <div className="space-y-4">
              <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-amber-500 font-bold">Wall of Excellence</h2>
              <h3 className="text-4xl md:text-5xl font-display text-white">Spotlight Performers</h3>
            </div>
            <button className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-primary border-b border-white/10 pb-2 transition-colors">View Directory</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {featured.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onProfileClick(p)}
                className="group relative bg-[#0d0d0f] border border-white/5 rounded-[2rem] p-8 flex flex-col items-center text-center cursor-pointer hover:border-primary/20 transition-all hover:-translate-y-2"
              >
                <div className="relative w-28 h-28 rounded-full mb-6 p-1 bg-gradient-to-tr from-white/10 to-transparent group-hover:from-primary/40">
                  <div className="w-full h-full rounded-full bg-secondary overflow-hidden shadow-2xl relative border-2 border-[#0d0d0f]">
                    {p.photo_url ? (
                      <img src={p.photo_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-4xl text-white/20">{p.name?.[0]}</div>
                    )}
                    {onlineUsers.has(p.user_id) && (
                      <div className="absolute inset-0 border-2 border-primary/40 rounded-full animate-ping" />
                    )}
                  </div>
                  {onlineUsers.has(p.user_id) && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-[#0d0d0f] rounded-full z-10" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-display text-lg text-white group-hover:text-primary transition-colors">{p.name}</h4>
                  {(p.plan === 'pro' || p.role === 'Admin') && <Crown size={14} className="text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
                  {(p as any).is_verified && <CheckCircle2 size={14} className="text-blue-500" />}
                </div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-primary/60 mb-6">{p.role}</p>
                <p className="text-[0.7rem] text-white/40 line-clamp-2 h-10 mb-8 font-light italic leading-relaxed">"{p.bio || 'Professional talent available for casting calls.'}"</p>

                <div className="w-full h-px bg-white/5 mb-6" />
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/20 group-hover:text-white transition-colors">Portofolio</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── CASTING CALLS ── */}
      {recentProjects.length > 0 && (
        <section className="py-32 px-6 max-w-7xl mx-auto relative z-30">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-[0.7rem] uppercase tracking-[0.4em] text-primary font-bold">Open Opportunities</h2>
            <h3 className="text-4xl md:text-5xl font-display text-white">Live Casting Calls</h3>
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
                className="group relative h-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 hover:bg-white/[0.04] hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 text-[0.65rem] font-bold tracking-[0.2em] text-white/30 uppercase mb-6">
                    <MapPin size={12} className="text-primary/60" /> {proj.location || 'Remote'}
                  </div>
                  <h4 className="font-display text-2xl text-white mb-4 group-hover:text-primary transition-all duration-300">{proj.title}</h4>
                  <p className="text-xs text-white/40 mb-10 font-light italic leading-relaxed">Looking for: {proj.role_category}</p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[0.5rem] uppercase tracking-widest text-white/20">Compensation</span>
                    <span className="text-[0.7rem] text-amber-500 font-bold tracking-widest uppercase">Competitive</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="mt-20 border-t border-white/5 py-24 relative z-30">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="flex justify-center mb-10 opacity-40 hover:opacity-100 transition-opacity">
            <h2 className="font-display text-3xl tracking-widest text-white uppercase italic">CaastingCall</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-[0.65rem] uppercase tracking-[0.3em] font-bold">
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onTermsClick(); }} className="text-white/40 hover:text-primary transition-colors">Privacy Policy</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); onTermsClick(); }} className="text-white/40 hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-white/40 hover:text-primary transition-colors">Instagram</a>
            <a href="#" className="text-white/40 hover:text-primary transition-colors">Twitter</a>
          </div>

          <div className="space-y-4">
            <p className="text-[0.6rem] text-white/20 uppercase tracking-[0.3em] font-medium italic">Empowering the world's finest talent since 2026</p>
            <p className="text-[0.6rem] text-white/10 uppercase tracking-[0.3em]">© 2026 CaastingCall. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
