import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageName } from "./AppDrawer";
import { profileService, type Profile } from "@/services/profileService";
import { ChevronsDown } from "lucide-react";

interface HomePageProps {
  onCategoryClick: (role: string) => void;
  onProfileClick: (profile: Partial<Profile> & { user_id: string }) => void;
  onTermsClick: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects"; openForm?: boolean }) => void;
  onlineUsers?: Set<string>;
  onOpenCastingTape?: () => void;
}

const dummyImages = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
];

const CategoryBox = ({ title, emoji, id, onCategoryClick }: { title: string, emoji: string, id: string, onCategoryClick: (id: string) => void }) => (
  <div className="relative mt-4 px-1 w-full mx-auto">
    <div className="border border-white/30 rounded-[1rem] p-2 pb-3 flex flex-col items-center flex-1 h-full">
      {/* Title over border */}
      <div className="absolute -top-3 bg-black px-1.5 flex items-center gap-1 max-w-[90%] justify-center whitespace-nowrap">
        <span className="text-[10px] md:text-xs drop-shadow-md">{emoji}</span>
        <span className="text-white font-bold text-[9px] md:text-[10px] truncate">{title}</span>
      </div>

      <div className="flex items-center justify-center mt-3 mb-2">
        <div className="w-6 h-6 rounded-full border border-black overflow-hidden relative z-0 translate-x-2">
          <img src={dummyImages[0]} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="w-8 h-8 rounded-full border border-black overflow-hidden relative z-10 shadow-lg">
          <img src={dummyImages[1]} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="w-6 h-6 rounded-full border border-black overflow-hidden relative z-0 -translate-x-2">
          <img src={dummyImages[2]} className="w-full h-full object-cover" alt="" />
        </div>
      </div>

      <button 
        onClick={() => onCategoryClick(id)}
        className="bg-[#FFCC00] text-black font-bold text-[0.55rem] px-3 py-1 rounded-full hover:bg-[#e6b800] transition-colors shadow-sm mt-auto whitespace-nowrap"
      >
        View More
      </button>
    </div>
  </div>
);

export default function HomePage({ onCategoryClick, onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await profileService.getProProfiles();
        setFeatured(data.slice(0, 8));
      } catch (err) {
        console.error("Failed to load pro talents");
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="bg-black min-h-screen text-white font-sans pb-0">
      {/* Hero Section */}
      <section className="relative w-full h-[28vh] md:h-[35vh]">
        <img 
          src="/hero-bg.png" 
          className="w-full h-full object-cover object-center opacity-80 z-0"
          alt="Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        
        <div className="absolute inset-0 z-20 flex flex-col justify-start px-4 md:px-12 max-w-4xl mx-auto pt-16 md:pt-20 mt-2">
          <h1 className="text-lg md:text-xl lg:text-2xl font-black text-[#8bb7df] tracking-wide mb-1 uppercase drop-shadow-lg max-w-[90vw]">
            A Premium Talent Network
          </h1>
          <p className="text-[0.55rem] md:text-[0.65rem] text-white mb-4 max-w-[80vw] md:max-w-md leading-relaxed drop-shadow-md font-medium">
            Discover top talent in one place, and get selected by others based on your unique profile and skills.
          </p>
          
          <div className="relative flex items-center gap-3 self-start md:ml-3 mt-2">
            <button 
              onClick={() => onNavigate(user ? "profile" : "auth")}
              className="border border-white/80 rounded-full px-3 py-1.5 text-white font-medium text-[0.6rem] md:text-xs backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              Register your profile
            </button>
            <button 
              onClick={() => onNavigate(user ? "profile" : "auth")}
              className="bg-[#FFCC00] text-black font-extrabold text-[0.6rem] md:text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-[#e6b800] transition-transform hover:scale-105"
            >
              Start here
            </button>
          </div>
        </div>
      </section>

      {/* Premium Featured Talents Carousel */}
      <section className="mt-2 border-t border-b border-[#3b82f6]/40 relative">
        <div 
          className="flex bg-cover bg-center overflow-hidden w-full max-w-full" 
          style={{ backgroundImage: "url('/premium-bg.png')" }}
        >
          {/* Label banner */}
          <div className="px-4 md:px-8 py-4 flex flex-col justify-center min-w-[140px] text-white backdrop-blur-md bg-black/10 border-r border-black/20 z-10 shrink-0 shadow-xl">
            <span className="font-extrabold text-lg md:text-xl leading-tight tracking-tight drop-shadow-lg text-white">Premium</span>
            <span className="font-bold text-sm md:text-base leading-tight tracking-tight drop-shadow-md text-white/90">Featured Talents</span>
          </div>
          
          {/* Blue Circles Container */}
          <div className="flex-1 min-w-0 flex items-center gap-4 px-4 overflow-x-auto no-scrollbar py-4 backdrop-blur-sm bg-black/10 scroll-smooth">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#1E3A8A]/80 shrink-0 border border-white/20 shadow-lg backdrop-blur-sm hover:scale-105 transition-transform cursor-pointer" />
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-xl mx-auto px-2 mt-6 mb-8">
        <div className="grid grid-cols-4 gap-x-1 gap-y-4">
          <CategoryBox title="Actors" emoji="🎭" id="Actor" onCategoryClick={onCategoryClick} />
          <CategoryBox title="Dancers" emoji="💃" id="Choreographer" onCategoryClick={onCategoryClick} />
          <CategoryBox title="Writers" emoji="📝" id="Director" onCategoryClick={onCategoryClick} />
          <CategoryBox title="Other" emoji="🎬" id="Producer" onCategoryClick={onCategoryClick} />
        </div>
      </section>

      {/* Footer Hero */}
      <section className="relative w-full h-[25vh]">
        <img 
          src="https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80" 
          className="w-full h-full object-cover opacity-70"
          alt="Stage"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
          <p className="text-white text-[0.5rem] text-center max-w-sm mb-2 leading-relaxed font-medium">
            Update your profile to showcase your talent.
          </p>
          <ChevronsDown className="text-white/50 animate-bounce" size={14} />
        </div>
      </section>
    </div>
  );
}
