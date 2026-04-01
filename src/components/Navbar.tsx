import { Search, Menu, Crown, Bell, MessageSquare, PlusCircle, Users, Briefcase, X, Smartphone, Command } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { PageName } from "./AppDrawer";
import { type Profile } from "@/services/profileService";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  onSearch: (term: string, type?: "talents" | "projects") => void;
  onAuthClick: () => void;
  onMenuClick: () => void;
  onLogoClick: () => void;
  onPremiumClick: () => void;
  onNotificationClick: () => void;
  onMessagesClick: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => void;
  activePage: PageName;
  searchType?: "talents" | "projects";
  onDownloadClick?: () => void;
}

export default function Navbar({
  onSearch, onAuthClick, onMenuClick, onLogoClick, onPremiumClick,
  onNotificationClick, onMessagesClick, onNavigate, activePage, searchType, onDownloadClick
}: NavbarProps) {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    const history = localStorage.getItem("search_history");
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const handleSearchCommit = (term: string) => {
    if (!term.trim()) return;
    
    // Update history
    const newHistory = [term, ...searchHistory.filter(s => s !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("search_history", JSON.stringify(newHistory));

    onSearch(term, searchType);
    setIsSearchOpen(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("search_history");
  };

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_read", false);
      setUnreadCount(count || 0);
    };

    const fetchUnreadMessages = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: 'exact', head: true })
        .eq("receiver_id", user.id)
        .or('is_read.eq.false,is_read.is.null');
      setUnreadMsgCount(count || 0);
    };

    fetchUnread();
    fetchUnreadMessages();

    const notifChannel = supabase.channel('notif-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchUnread())
      .subscribe();

    const msgChannel = supabase.channel('msg-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnreadMessages())
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);

  const isPro = profile?.plan === "pro";



  const navItemClass = (id: PageName, currentSearchType?: string) => `
    flex items-center gap-2 px-5 py-2 rounded-full text-[0.65rem] uppercase tracking-[0.12em] font-semibold transition-all duration-500
    ${activePage === id && (!currentSearchType || searchType === currentSearchType) 
      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 ghost-border'}
  `;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Breadcrumb path label per page
  const breadcrumbLabel: Record<string, string> = {
    home: 'HOME', search: 'SEARCH', feed: 'FEED', profile: 'PROFILE',
    projects: 'PROJECTS', messages: 'MESSAGES', settings: 'SETTINGS',
    analytics: 'ANALYTICS', admin: 'ADMIN', saved: 'SAVED', premium: 'PREMIUM',
  };
  const crumb = breadcrumbLabel[activePage] || activePage.toUpperCase();

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-background/40 backdrop-blur-3xl border-b border-white/5 transition-all duration-700">
      {/* ── Technical Breadcrumb Strip ── */}
      <div className="hidden md:flex items-center px-12 py-1.5 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-4 text-[0.55rem] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
          <span className="text-primary/40">The Casting Call Network</span>
          <span className="opacity-20 italic">v3.0.1</span>
          <div className="w-px h-3 bg-white/5" />
          <span className="current text-white/40">{crumb}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-8 md:px-12 h-20 max-w-[2000px] mx-auto">
        {/* Logo Section */}
        <div className="flex items-center gap-12">
           <button 
             onClick={onLogoClick} 
             className="relative group flex items-center flex-shrink-0 transition-transform duration-500 font-display text-2xl md:text-3xl italic tracking-tighter text-primary active:scale-95"
           >
             Caasting<span className="text-white">Call</span>
             <div className="absolute -bottom-1 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-700" />
           </button>

           {/* Desktop Nav Items */}
           <div className="hidden lg:flex items-center gap-2">
              <button onClick={() => onNavigate('home')} className={navItemClass('home')}>Discovery</button>
              <button onClick={() => onNavigate('search', { searchType: 'talents' })} className={navItemClass('search', 'talents')}>Talent Hub</button>
              <button onClick={() => onNavigate('projects')} className={navItemClass('projects')}>Casting Calls</button>
              <button onClick={() => onNavigate('feed')} className={navItemClass('feed')}>Editorial Feed</button>
           </div>
        </div>

        <div className="flex-1 flex items-center justify-end gap-3 md:gap-6">
          {/* Universal Command / Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground hover:border-primary/20 hover:text-primary transition-all group"
          >
            <Search size={18} className="group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-[0.6rem] font-black uppercase tracking-[0.2em] opacity-40">Command Center</span>
            <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-black/40 rounded-lg border border-white/5">
               <Command size={9} />
               <span className="font-mono-tech text-[0.45rem]">K</span>
            </div>
          </button>

          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onMessagesClick}
                  className="p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-primary transition-all relative"
                >
                  <MessageSquare size={18} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(245,197,24,0.6)]" />
                  )}
                </button>
  
                <button
                  onClick={onNotificationClick}
                  className="p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-primary transition-all relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </button>
              </div>
            )}

            {!isPro && (
               <button
                 onClick={onPremiumClick}
                 className="hidden xl:flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all font-display font-black text-[0.6rem] uppercase tracking-[0.2em]"
               >
                 <Crown size={14} />
                 Elevate to PRO
               </button>
            )}

            <button
              onClick={onAuthClick}
              className={`relative px-8 py-3 rounded-2xl font-display font-black text-[0.65rem] uppercase tracking-[0.3em] transition-all duration-500 flex items-center gap-3 ${isPro
                ? "bg-amber-500 text-black shadow-2xl shadow-amber-500/20 hover:scale-105"
                : "bg-primary text-primary-foreground hover:shadow-2xl hover:shadow-primary/30 active:scale-95"
                }`}
            >
              {isPro && <Crown size={14} />}
              {user ? (isPro ? "Dashboard" : "Studio") : "Join the Stage"}
            </button>

            <button
              onClick={onMenuClick}
              className="p-3.5 rounded-2xl bg-white/5 text-muted-foreground hover:text-primary border border-white/5 transition-all active:scale-90"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Cinematic Search Overlay */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur-[50px] flex flex-col items-center pt-[12vh] px-8"
            >
              <div className="w-full max-w-3xl relative">
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  className="space-y-12"
                >
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSearchCommit(searchValue); }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex items-center gap-6 border-b-2 border-white/10 pb-6 focus-within:border-primary transition-colors">
                      <Search size={32} className="text-primary" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search for talent, directors, or casting calls..."
                        className="bg-transparent border-none outline-none text-2xl md:text-3xl text-white font-display uppercase tracking-widest w-full placeholder:text-muted-foreground/10"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-white/20">Press <span className="text-white">Enter</span> to initiate query</p>
                       <button onClick={() => setIsSearchOpen(false)} className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-primary hover:tracking-[0.6em] transition-all">ESC TO CLOSE</button>
                    </div>
                  </form>

                  {/* Search History */}
                  <div className="space-y-8">
                     <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h4 className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-primary/40 text-center w-full">Recent Architectural Discoveries</h4>
                     </div>
                     
                     {searchHistory.length > 0 ? (
                       <div className="flex flex-wrap justify-center gap-4">
                          {searchHistory.map((term, index) => (
                            <motion.button
                              key={`${term}-${index}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => { setSearchValue(term); handleSearchCommit(term); }}
                              className="px-6 py-3 rounded-2xl border border-white/5 bg-white/5 text-[0.65rem] font-black uppercase tracking-[0.2em] text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center gap-3 group/item shadow-2xl"
                            >
                              {term}
                            </motion.button>
                          ))}
                       </div>
                     ) : (
                       <div className="py-24 text-center">
                          <Search size={48} className="mx-auto text-white/[0.02] mb-6" />
                          <p className="text-[0.5rem] font-black uppercase tracking-[0.5em] text-muted-foreground/10">No recent history detected in local archive</p>
                       </div>
                     )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
