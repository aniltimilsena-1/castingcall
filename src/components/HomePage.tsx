import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageName } from "./AppDrawer";
import { profileService, type Profile } from "@/services/profileService";

interface HomePageProps {
  onCategoryClick: (role: string) => void;
  onProfileClick: (profile: Partial<Profile> & { user_id: string }) => void;
  onTermsClick: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects"; openForm?: boolean }) => void;
  onlineUsers?: Set<string>;
  onOpenCastingTape?: () => void;
}

const PremiumTalentBadge = ({ profile }: { profile: Profile }) => {
  const defaultImage = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80";
  return (
    <div 
      className="flex flex-col items-center shrink-0 w-[4.5rem] md:w-24 cursor-pointer hover:scale-105 transition-transform"
      onClick={() => {/* Assuming profile click is handled or bubbled up */}}
    >
      <div className="relative w-[3.5rem] h-[3.5rem] md:w-[4.5rem] md:h-[4.5rem] mb-1 flex items-center justify-center mt-1">
        {/* Scalloped badge background */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#E0F7FA] drop-shadow-md">
          <path fill="currentcolor" d="M50 0 L58 8 L69 5 L74 15 L85 15 L87 26 L96 30 L93 41 L100 50 L93 59 L96 70 L87 74 L85 85 L74 85 L69 95 L58 92 L50 100 L42 92 L31 95 L26 85 L15 85 L13 74 L4 70 L7 59 L0 50 L7 41 L4 30 L13 26 L15 15 L26 15 L31 5 L42 8 Z" />
        </svg>
        <div className="w-[82%] h-[82%] rounded-full overflow-hidden z-10 border border-white bg-white flex items-center justify-center">
          {profile.photo_url ? (
            <img 
               src={profile.photo_url} 
               alt={profile.name || "Talent"} 
               className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display font-extrabold text-[#111] text-lg md:text-xl">
              {(profile.name || "U").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {/* Blue verification checkmark */}
        <div className="absolute -bottom-1 z-20 bg-[#1DA1F2] rounded-full border-[1.5px] border-white text-white p-[2px] shadow-sm flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[10px] w-[10px] md:h-3 md:w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      <span className="text-white text-[9px] md:text-[11px] font-medium text-center truncate w-full px-1">
         {profile.name || "Unknown"}
      </span>
    </div>
  );
};

const CategorySection = ({ title, id, profiles, onCategoryClick }: { title: string, id: string, profiles: Profile[], onCategoryClick: (id: string) => void }) => {
  // Only display actual profiles that exist, up to a maximum of 3
  const displayProfiles = profiles.slice(0, 3);

  return (
    <div className="flex flex-col w-full md:w-[90%] mx-auto mt-2">
      {/* Title with line - matching exact alignment of image */}
      <div className="flex items-center gap-2 mb-4 w-full pl-2 md:pl-4">
        <h3 className="text-white font-bold text-[13px] md:text-base tracking-wide whitespace-nowrap">{title}</h3>
        <div className="h-[2px] bg-white/70 flex-1 ml-1 mr-4"></div>
      </div>

      {/* Overlapping profiles container */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center mb-1 h-[80px] md:h-[120px] lg:h-[140px]">
          {displayProfiles.length > 0 ? (
            <div className="flex items-center justify-center -space-x-4 md:-space-x-6 lg:-space-x-8">
              {displayProfiles.map((p, idx) => {
                const total = displayProfiles.length;
                const isCenter = total === 3 ? idx === 1 : (total === 2 ? false : true); // Just basic logic for highlighting
                const fallbackImg = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80";
                
                return (
                  <div 
                    key={p.id || `profile-${idx}`} 
                    className={`rounded-full overflow-hidden border-[1.5px] lg:border-2 border-black bg-white border-solid flex items-center justify-center
                      ${(total === 3 && isCenter) || (total === 1) ? 'w-[4.5rem] h-[4.5rem] md:w-[6rem] md:h-[6rem] lg:w-[7.5rem] lg:h-[7.5rem] z-10 shadow-xl' : 'w-14 h-14 md:w-[4.5rem] md:h-[4.5rem] lg:w-[5.5rem] lg:h-[5.5rem] z-0 shadow-md opacity-90'}
                    `}
                  >
                    {p?.photo_url ? (
                      <img 
                        src={p.photo_url} 
                        className="w-full h-full object-cover" 
                        alt={p?.name || "Talent"} 
                      />
                    ) : (
                      <span className="font-display font-extrabold text-[#111] text-xl md:text-3xl">
                        {(p?.name || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-white/30 text-[10px] uppercase font-black tracking-widest">
              No profiles yet
            </div>
          )}
        </div>

        {/* View More Button */}
        <button 
          onClick={() => onCategoryClick(id)}
          className="bg-[#FFCC00] text-black font-extrabold text-[10px] md:text-xs lg:text-sm px-6 lg:px-8 py-[5px] lg:py-[8px] rounded-full hover:bg-[#e6b800] transition-colors shadow-md whitespace-nowrap lg:-mt-3 -mt-2 z-20"
        >
          View More
        </button>
      </div>
    </div>
  );
};

export default function HomePage({ onCategoryClick, onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<Profile[]>([]);
  const [actors, setActors] = useState<Profile[]>([]);
  const [directors, setDirectors] = useState<Profile[]>([]);
  const [singers, setSingers] = useState<Profile[]>([]);
  const [cinematographers, setCinematographers] = useState<Profile[]>([]);
  const [choreographers, setChoreographers] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pro, a, d, s, c, chor] = await Promise.all([
          profileService.getProProfiles(),
          profileService.searchProfiles({ role: "Actor" }),
          profileService.searchProfiles({ role: "Director" }),
          profileService.searchProfiles({ role: "Singer" }),
          profileService.searchProfiles({ role: "Cinematographer" }),
          profileService.searchProfiles({ role: "Choreographer" })
        ]);
        setFeatured(pro.slice(0, 10) as Profile[]);
        setActors(a.slice(0, 3) as Profile[]);
        setDirectors(d.slice(0, 3) as Profile[]);
        setSingers(s.slice(0, 3) as Profile[]);
        setCinematographers(c.slice(0, 3) as Profile[]);
        setChoreographers(chor.slice(0, 3) as Profile[]);
      } catch (err) {
        console.error("Failed to load talents");
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-black min-h-screen text-white font-sans pb-0 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full h-[32vh] md:h-[40vh]">
        <img 
          src="/hero-bg.png" 
          className="w-full h-full object-cover object-center opacity-60 z-0 mix-blend-overlay"
          alt="Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/30 z-10" />
        
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-12 max-w-[1400px] mx-auto pt-6">
          <h1 className="text-[22px] md:text-4xl lg:text-5xl font-serif text-[#8cd1e8] font-bold tracking-wide mb-1 lg:mb-3 drop-shadow-lg leading-tight">
            Premium talent network
          </h1>
          <p className="text-[10px] md:text-sm lg:text-lg text-white/90 mb-4 max-w-[85vw] md:max-w-xl lg:max-w-2xl leading-snug drop-shadow-md">
            Discover top talent in one place, and get selected by others based on your unique profile and skills.
          </p>
        </div>
      </section>

      {/* Premium Featured Talents Carousel Overlaying Hero */}
      {/* Set negative margin to overlay header slightly */}
      <section className="relative z-30 transform -translate-y-8 md:-translate-y-12 shrink-0 w-full max-w-[1200px] mx-auto lg:px-8">
        <div className="flex w-full overflow-hidden bg-black/60 backdrop-blur-md border-y lg:border border-white/10 shadow-2xl lg:rounded-2xl">
          {/* Light Blue Label banner block */}
          <div className="bg-[#87CEEB] px-3 md:px-6 py-4 flex flex-col justify-center min-w-[90px] md:min-w-[120px] shadow-lg shrink-0 z-10 items-center">
            <span className="font-extrabold text-[#111] text-sm md:text-lg leading-tight tracking-tight">Premium</span>
            <span className="font-bold text-[#111] text-[10px] md:text-[13px] leading-tight text-center">Featured Talents</span>
          </div>
          
          {/* Horizontal Scroller */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 md:gap-4 px-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
            {featured.length > 0 ? (
              featured.map((profile, i) => (
                <PremiumTalentBadge key={profile.id || i} profile={profile} />
              ))
            ) : (
              // Fallback skeleton styling
              Array.from({ length: 5 }).map((_, i) => (
                <div key={`sk-${i}`} className="w-[4.5rem] md:w-24 shrink-0 flex flex-col items-center">
                   <div className="w-[3.5rem] h-[3.5rem] md:w-[4.5rem] md:h-[4.5rem] rounded-full bg-white/20 animate-pulse mt-2 mb-1"></div>
                   <div className="h-2.5 w-10 bg-white/20 rounded-full mt-1 animate-pulse"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Separator Line */}
      <div className="w-full h-[1px] bg-white/10 my-4 hidden md:block"></div>

      {/* Categories Grid (2x2) */}
      <section className="max-w-[1400px] mx-auto px-1 md:px-8 mt-2 md:mt-12 mb-12 md:mb-20">
        {/* On mobile: 2 cols x 3 rows. On desktop: 2 rows of 3, or large desktop: flex wrap / 5 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-2 lg:gap-x-8 gap-y-10 md:gap-y-16 relative">
          <CategorySection title="Actors" id="Actor" profiles={actors} onCategoryClick={onCategoryClick} />
          <CategorySection title="Director" id="Director" profiles={directors} onCategoryClick={onCategoryClick} />
          <CategorySection title="Singer" id="Singer" profiles={singers} onCategoryClick={onCategoryClick} />
          <CategorySection title="Cinematographer" id="Cinematographer" profiles={cinematographers} onCategoryClick={onCategoryClick} />
          <CategorySection title="Choreographer" id="Choreographer" profiles={choreographers} onCategoryClick={onCategoryClick} />
        </div>
      </section>

      {/* Footer Hero Image */}
      <section className="relative w-full h-[35vh] border-t border-white/10 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80" 
          className="w-full h-full object-cover opacity-40 brightness-75 contrast-125 saturate-50"
          alt="Stage"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
        
        {/* Footer content exactly like the bottom section of image */}
        <div className="absolute inset-x-0 bottom-6 md:bottom-10 flex flex-col items-center">
          <p className="text-white text-[10px] md:text-sm text-left md:text-center leading-relaxed font-medium px-8 md:px-4 max-w-2xl text-shadow-md">
            Update your profile here to showcase your talent globally.<br />
            If casting directors discover your profile, you may get selected and step into the industry.
          </p>
        </div>
      </section>
    </div>
  );
}
