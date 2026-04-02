import { useEffect, useState } from "react";
import { profileService, Profile } from "@/services/profileService";
import { Plus, Check, ChevronLeft, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CategoryPageProps {
  role: string;
  onBack: () => void;
  onProfileClick: (profile: Partial<Profile> & { user_id: string }) => void;
}

export default function CategoryPage({ role, onBack, onProfileClick }: CategoryPageProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Map pure role ids to display names
  const roleDisplayNames: Record<string, string> = {
    "Actor": "Actors/Actress",
    "Choreographer": "Dancers",
    "Director": "Writer/Director",
    "Producer": "Other",
    "all": "All Categories"
  };

  const displayName = roleDisplayNames[role] || `${role}s`;

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const queryRole = role === "all" ? undefined : role;
        const data = await profileService.searchProfiles({ role: queryRole });
        setProfiles(data as Profile[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [role]);

  useEffect(() => {
    if (user?.id) {
      const fetchSaved = async () => {
        try {
          const { data } = await supabase.from("saved_talents").select("talent_profile_id").eq("user_id", user.id);
          if (data) {
            setSavedIds(data.map(s => s.talent_profile_id));
          }
        } catch (err) {}
      };
      fetchSaved();
    }
  }, [user?.id]);

  const toggleSave = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Log in to save talents");
      return;
    }
    const isSaved = savedIds.includes(profileId);
    try {
      if (isSaved) {
        await supabase.from("saved_talents").delete().eq("user_id", user.id).eq("talent_profile_id", profileId);
        setSavedIds(prev => prev.filter(id => id !== profileId));
      } else {
        await supabase.from("saved_talents").upsert({ user_id: user.id, talent_profile_id: profileId }, { onConflict: 'user_id,talent_profile_id' });
        setSavedIds(prev => [...prev, profileId]);
        toast.success("Saved successfully");
      }
    } catch(e) {}
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] pt-[5.5rem] md:pt-24 pb-24 relative overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-multiply" />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 pt-2">
        {/* Header Block */}
        <div className="mb-8 pl-1">
          <button 
            onClick={() => {
              if (selectedProfile) setSelectedProfile(null);
              else onBack();
            }}
            className="flex items-center text-black transition-colors mb-4 md:mb-6 w-fit cursor-pointer group hover:opacity-80"
          >
            <ArrowLeft size={24} strokeWidth={3} className="-ml-2 mr-1 text-[#0066cc] group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm md:text-base">Back</span>
          </button>
          <h1 className="text-3xl md:text-5xl font-black text-black tracking-tight mb-2 md:mb-3">{displayName}</h1>
        </div>

        {selectedProfile ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* White Detailed Profile Card */}
            <div className="bg-[#f0f2f5] md:bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] pt-12 pb-12 px-6 md:px-12 shadow-sm flex flex-col items-center min-h-[50vh]">
              {/* Profile image centered at top */}
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-[3px] border-white shadow-lg mb-8 bg-white flex items-center justify-center">
                {selectedProfile.photo_url ? (
                  <img 
                    src={selectedProfile.photo_url} 
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display font-extrabold text-gray-800 text-6xl md:text-8xl">
                    {(selectedProfile.name || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Information Dictionary Stack */}
              <div className="w-full max-w-sm flex flex-col gap-3 mb-12 text-[14px] md:text-[16px]">
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Original Name :</span>
                  <span className="font-extrabold text-black font-serif tracking-wide">{selectedProfile.name}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Profession :</span>
                  <span className="font-extrabold text-black">{selectedProfile.role?.replace('/', '') || 'Talent'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Nick Name :</span>
                  <span className="font-extrabold text-black">{selectedProfile.name?.split(' ')[0] || ''}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Nationality :</span>
                  <span className="font-extrabold text-black">{selectedProfile.location || 'Nepali'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Language :</span>
                  <span className="font-extrabold text-black">Nepali, Hindi, English</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Experience :</span>
                  <span className="font-extrabold text-black">{selectedProfile.experience_years ? `${selectedProfile.experience_years} years` : 'New entry'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Birth Place :</span>
                  <span className="font-extrabold text-black">{selectedProfile.location || ''}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-800 w-[120px] shrink-0">Now lives in :</span>
                  <span className="font-extrabold text-black">{selectedProfile.location ? `${selectedProfile.location}, Nepal` : ''}</span>
                </div>
              </div>

              {/* Hyperlinks Grid */}
              <div className="w-full max-w-sm grid grid-cols-2 gap-y-4 gap-x-2">
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#0066cc] underline text-sm md:text-base font-medium hover:opacity-75 transition-opacity">video profile</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#0066cc] underline text-sm md:text-base font-medium hover:opacity-75 transition-opacity">Full CV PDF</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#0066cc] underline text-sm md:text-base font-medium hover:opacity-75 transition-opacity">Photographs</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#0066cc] underline text-sm md:text-base font-medium hover:opacity-75 transition-opacity">Facebook link</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#0066cc] underline text-sm md:text-base font-medium hover:opacity-75 transition-opacity">View clips</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="text-[#0066cc] underline text-sm md:text-base font-medium hover:opacity-75 transition-opacity">Direct call/Message</a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sort Filter */}
            <div className="flex justify-end items-center mb-6 pr-1">
              <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-70 transition-opacity text-black">
                <span className="font-bold text-sm md:text-base tracking-wide whitespace-nowrap">Sort by</span>
                <div className="flex flex-col gap-[4px] items-end justify-center w-6 h-6">
                  <div className="w-6 h-[2.5px] bg-black rounded-full" />
                  <div className="w-4 h-[2.5px] bg-black rounded-full" />
                  <div className="w-6 h-[2.5px] bg-black rounded-full" />
                </div>
              </div>
            </div>

            {/* List Grid */}
            <div className="space-y-4 animate-in fade-in duration-300">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4 animate-pulse shadow-sm h-[6.5rem]">
                    <div className="w-[4.5rem] h-[4.5rem] bg-gray-200 rounded-full shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : profiles.length === 0 ? (
                <div className="text-center py-24 text-gray-500 font-medium">No profiles found in this category.</div>
              ) : (
                profiles.map(p => {
                  const isSaved = savedIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedProfile(p)}
                      className="bg-white rounded-[1.25rem] p-3 md:p-4 flex items-center pr-6 cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.08)] transform transition-all active:scale-[0.98]"
                    >
                      <div className="w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 rounded-full overflow-hidden shrink-0 shadow-inner mr-4 md:mr-6 bg-white border border-gray-100 flex items-center justify-center">
                        {p.photo_url ? (
                          <img 
                            src={p.photo_url} 
                            alt={p.name || "Talent"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-display font-extrabold text-gray-800 text-3xl md:text-4xl">
                            {(p.name || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-[#111] text-lg md:text-2xl leading-tight mb-1 truncate">{p.name || "Unknown"}</h3>
                        <div className="flex items-center gap-2 flex-wrap pb-0.5">
                          <span className="text-[#333] font-medium text-[12px] md:text-sm">{(p.role === 'Admin' ? 'Member' : p.role)?.replace('/', '') || "Talent"}</span>
                          <span className="text-[#0066cc] font-medium text-[11px] md:text-xs tracking-tight bg-[#0066cc]/5 px-2 py-0.5 rounded-sm">
                            {p.location || 'Nepal'} {p.experience_years ? `• ${p.experience_years}y Exp` : ''}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => toggleSave(e, p.id)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
                      >
                        {isSaved ? (
                          <Check className="text-[#0066cc]" strokeWidth={3} size={24} />
                        ) : (
                          <Plus className="text-[#0066cc]" strokeWidth={3} size={24} />
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
