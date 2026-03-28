import { Search, Menu, Crown, Bell, MessageSquare, PlusCircle, Users, Briefcase, X, Smartphone } from "lucide-react";
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

  return (
    <nav className="absolute top-0 left-0 w-full z-[100] bg-transparent transition-all duration-500">
      <div className="flex items-center justify-between px-8 md:px-12 h-20 max-w-[2000px] mx-auto">
        <button 
          onClick={onLogoClick} 
          className="relative group flex items-center flex-shrink-0 transition-all duration-700 font-accent text-2xl font-black italic tracking-tighter text-primary active:scale-95"
          title="Home"
        >
          CaastingCall
        </button>

        <div className="flex-1 flex items-center justify-end gap-2 md:gap-6">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex p-2 md:p-2.5 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-primary transition-all relative border border-transparent hover:border-foreground/10"
            title="Open Search"
          >
            <Search size={22} />
          </button>

          {/* Full Screen Search Overlay */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-2xl flex flex-col items-center pt-[8vh] px-6"
              >
                <div className="w-full max-w-2xl relative">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="relative group search-full-screen"
                  >
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSearchCommit(searchValue); }}
                      className="flex items-center w-full bg-card/40 border-2 border-primary/20 focus-within:border-primary rounded-[1.5rem] px-5 py-3.5 gap-4 shadow-[0_0_40px_rgba(245,197,24,0.08)] transition-all"
                    >
                      <Search size={22} className="text-primary/60 group-focus-within:text-primary transition-colors flex-shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search talents, projects..."
                        className="bg-transparent border-none outline-none text-lg md:text-xl text-white font-display uppercase tracking-wider w-full placeholder:text-muted-foreground/20 italic"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-primary text-black px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex-shrink-0"
                      >
                        SEARCH
                      </button>
                    </form>

                    <button 
                      onClick={() => setIsSearchOpen(false)}
                      className="absolute -top-12 right-0 p-2 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </motion.div>

                  <div className="mt-12 px-4 max-w-2xl mx-auto w-full">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Recent Searches</h4>
                        {searchHistory.length > 0 && (
                          <button 
                            onClick={clearHistory}
                            className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            Clear All
                          </button>
                        )}
                     </div>
                     
                     {searchHistory.length > 0 ? (
                       <div className="flex flex-wrap gap-3">
                          {searchHistory.map((term, index) => (
                            <motion.button
                              key={`${term}-${index}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => { setSearchValue(term); handleSearchCommit(term); }}
                              className="px-4 py-2 rounded-xl border border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group/item"
                            >
                              <Search size={10} className="opacity-40 group-hover/item:text-primary transition-colors" />
                              {term}
                            </motion.button>
                          ))}
                       </div>
                     ) : (
                       <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                          <Search size={32} className="mx-auto text-white/5 mb-4" />
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Your recent searches will appear here</p>
                       </div>
                     )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:flex items-center gap-1 md:gap-4 lg:gap-6">
            {user && (
              <>
                <button
                  onClick={onMessagesClick}
                  className="flex p-2 md:p-2.5 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-primary transition-all relative border border-transparent hover:border-foreground/10"
                  title="Direct Messages"
                >
                  <MessageSquare size={18} className={`transition-colors ${unreadMsgCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
                  )}
                </button>
  
                <button
                  onClick={onNotificationClick}
                  className="flex p-2 md:p-2.5 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-primary transition-all relative border border-transparent hover:border-foreground/10"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-background animate-pulse" />
                  )}
                </button>
              </>
            )}

            {!isPro && (
              <button
                onClick={onPremiumClick}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 transition-colors font-body font-normal text-[0.6rem] uppercase tracking-wider"
              >
                <Crown className="w-3.5 h-3.5" />
                Upgrade
              </button>
            )}

            {onDownloadClick && (
              <button
                 onClick={onDownloadClick}
                 className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-colors font-body font-normal text-[0.6rem] uppercase tracking-wider"
              >
                 <Smartphone className="w-3.5 h-3.5" />
                 Get App
              </button>
            )}
          </div>

          <button
            onClick={onAuthClick}
            className={`relative px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-full font-accent font-bold text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.15em] transition-all duration-500 flex items-center gap-1 sm:gap-2 whitespace-nowrap ${isPro
              ? "border border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              : "bg-primary text-primary-foreground hover:opacity-90 hover:scale-105 shadow-xl shadow-primary/30"
              }`}
          >
            {isPro && <Crown size={12} className="animate-pulse" />}
            {user ? (isPro ? (isMobile ? "PRO" : "DASHBOARD") : "STAGE") : "JOIN"}
          </button>

          <button
            onClick={onMenuClick}
            className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-secondary/20 text-muted-foreground hover:text-primary transition-colors hover:bg-secondary flex items-center justify-center flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
