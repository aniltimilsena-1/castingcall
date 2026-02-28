import { Video, Clapperboard, Music, PersonStanding, Crown, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HomePageProps {
  onCategoryClick: (role: string) => void;
  onProfileClick: (profile: any) => void;
  onTermsClick: () => void;
}

const categories = [
  { role: "Actor", icon: Video, delay: 0.08 },
  { role: "Director", icon: Clapperboard, delay: 0.16 },
  { role: "Singer", icon: Music, delay: 0.24 },
  { role: "Choreographer", icon: PersonStanding, delay: 0.32 },
];

export default function HomePage({ onCategoryClick, onProfileClick, onTermsClick }: HomePageProps) {
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('plan', 'pro').limit(4);
      setFeatured(data || []);
    };
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] pb-32">
      <motion.section
        className="text-center py-16 md:py-20 px-6 md:px-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-10">
          <img src="/logo.png" alt="CastingCall Logo" className="h-40 w-auto animate-fade-in" />
        </div>
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-primary tracking-wider uppercase flex flex-col items-center gap-2">
          <span>Find Your Next Star</span>
          <div className="h-1 w-24 bg-primary/20 rounded-full" />
        </h1>
      </motion.section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1200px] mx-auto px-6 md:px-4 pb-20">
        {categories.map((cat) => (
          <motion.button
            key={cat.role}
            onClick={() => onCategoryClick(cat.role)}
            className="bg-card border-[1.5px] border-card-border rounded-2xl p-12 flex flex-col items-center gap-5 cursor-pointer hover:border-primary hover:-translate-y-1 gold-glow transition-all duration-250 group"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: cat.delay }}
          >
            <cat.icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            <span className="font-display text-xl text-primary tracking-wide">{cat.role}</span>
          </motion.button>
        ))}
      </div>

      {featured.length > 0 && (
        <motion.div
          className="max-w-[1200px] mx-auto px-6 md:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-6 mb-12">
            <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-[3px]">
              <Star fill="currentColor" size={14} /> Featured Talent
            </div>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featured.map((p) => (
              <div
                key={p.id}
                onClick={() => onProfileClick(p)}
                className="bg-card/50 border border-border/10 rounded-3xl p-6 flex flex-col items-center text-center group hover:border-primary/50 transition-all cursor-pointer"
              >
                <div className="w-24 h-24 rounded-full bg-secondary border-2 border-primary mb-5 overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                  {p.photo_url ? (
                    <img src={p.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-display text-3xl text-primary">{p.name?.[0]}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-foreground text-lg">{p.name}</h4>
                  <Crown size={14} className="text-amber-500" />
                </div>
                <p className="text-[0.6rem] font-black uppercase tracking-[2px] text-primary/70 mb-4">{p.role}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 h-8 mb-6 italic">"{p.bio || 'Professional talent available for casting calls.'}"</p>
                <button className="text-[0.65rem] font-black uppercase tracking-[2px] text-foreground group-hover:text-primary transition-colors">View Profile →</button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <footer className="mt-20 border-t border-border/10 pt-10 text-center space-y-4">
        <div className="flex justify-center gap-6 text-xs uppercase tracking-widest font-black">
          <a href="/privacy" onClick={(e) => { e.preventDefault(); onTermsClick(); }} className="text-foreground hover:text-primary transition-colors cursor-pointer border-b border-border/20 pb-1">Privacy Policy</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); onTermsClick(); }} className="text-foreground hover:text-primary transition-colors cursor-pointer border-b border-border/20 pb-1">Terms of Service</a>
        </div>
        <p className="text-[0.6rem] text-muted-foreground/50 uppercase tracking-[2px]">© 2026 CastingCall. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
