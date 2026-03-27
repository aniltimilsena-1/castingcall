import { Search, Menu, Crown, Bell, MessageSquare, PlusCircle, Users, Briefcase, Clock, X } from "lucide-react";
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
}

export default function Navbar({
  onSearch, onAuthClick, onMenuClick, onLogoClick, onPremiumClick,
  onNotificationClick, onMessagesClick, onNavigate, activePage, searchType
}: NavbarProps) {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('search_history') || '[]');
  });

  const handleSearchCommit = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
    onSearch(term, searchType);
    setShowAutocomplete(false);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue.trim()) {
      handleSearchCommit(searchValue.trim());
    }
  };

  useEffect(() => {
    if (!searchValue.trim()) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', `%${searchValue}%`)
        .neq('role', 'Admin')
        .limit(5);
      if (data) setSuggestions(data as Profile[]);
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

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
          <div className="flex-1 max-w-[120px] md:max-w-[240px] relative">
            <div className="flex items-center gap-1.5 bg-background/40 backdrop-blur-md border border-border/60 rounded-full px-3 py-1 w-full focus-within:border-primary transition-all shadow-sm">
              <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                className="bg-transparent border-none outline-none text-foreground font-body text-[0.6rem] w-full placeholder:text-muted-foreground/30 font-bold uppercase tracking-widest"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <AnimatePresence>
              {showAutocomplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 left-0 w-full glass-card border border-border shadow-2xl rounded-2xl overflow-hidden z-[200] p-1 shadow-primary/10"
                >
                  {suggestions.length > 0 && (
                    <div className="p-2">
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 px-2">Suggestions</div>
                       {suggestions.map(s => (
                         <button
                           key={s.user_id}
                           onClick={() => {
                             if (onNavigate) {
                               onNavigate('profile');
                               handleSearchCommit(s.name!);
                             }
                           }}
                           className="w-full flex items-center gap-3 p-2 hover:bg-foreground/5 rounded-xl transition-all group"
                         >
                           <div className="w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden">
                             {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px]">{s.name?.[0]}</div>}
                           </div>
                           <div className="text-left">
                             <div className="text-xs text-foreground font-bold group-hover:text-primary transition-colors">{s.name}</div>
                             <div className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">{s.role || "Talent"}</div>
                           </div>
                         </button>
                       ))}
                    </div>
                  )}

                  {searchValue.length === 0 && searchHistory.length > 0 && (
                    <div className="p-2 border-t border-border/10">
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 px-2">Recent Searches</div>
                       {searchHistory.map((term, i) => (
                         <button
                           key={i}
                           onClick={() => {
                             setSearchValue(term);
                             handleSearchCommit(term);
                           }}
                           className="w-full flex items-center justify-between p-2 hover:bg-foreground/5 rounded-xl transition-all group"
                         >
                           <div className="flex items-center gap-3">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-foreground group-hover:text-primary transition-colors">{term}</span>
                           </div>
                           <X 
                             size={12} 
                             className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                             onClick={(e) => {
                               e.stopPropagation();
                               const newHist = searchHistory.filter(h => h !== term);
                               setSearchHistory(newHist);
                               localStorage.setItem('search_history', JSON.stringify(newHist));
                             }}
                            />
                         </button>
                       ))}
                    </div>
                  )}

                  {suggestions.length === 0 && (searchValue.length > 0 || searchHistory.length === 0) && (
                    <div className="p-4 text-center text-muted-foreground text-[10px] uppercase tracking-widest font-light italic">
                      {searchValue.length > 0 ? "Searching worldwide..." : "No recent searches"}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
