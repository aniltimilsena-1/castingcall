import { Search, Moon, Sun, Menu, Crown, Bell, MessageSquare, PlusCircle, Users, Briefcase, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { PageName } from "./AppDrawer";

interface NavbarProps {
  onSearch: (term: string) => void;
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
  const { theme, setTheme } = useTheme();
  const [searchValue, setSearchValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

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
      onSearch(searchValue.trim());
    }
  };

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
    <nav className="sticky top-0 glass z-[100] border-b border-foreground/5 shadow-2xl shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center justify-between px-4 md:px-8 h-20 max-w-[2000px] mx-auto">
        {/* Logo */}
        <button onClick={onLogoClick} className="flex items-center group flex-shrink-0">
          <img
            src="/logo.png"
            alt="CaastingCall Logo"
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="font-accent text-2xl text-primary tracking-tight">CaastingCall</span>';
            }}
          />
        </button>

        {/* Center Links - Horizontal Scroll on Tablet/Mobile, Flex on Desktop */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mask-fade-right lg:mask-none group/nav">
          <button onClick={() => onNavigate("home")} className={navItemClass("home")}>
            <Home size={14} /> Home
          </button>
          <button onClick={() => onNavigate("search", { searchType: "projects" })} className={navItemClass("search", "projects")}>
            <Briefcase size={14} /> Casting Calls
          </button>
          <button onClick={() => onNavigate("search", { searchType: "talents" })} className={navItemClass("search", "talents")}>
            <Users size={14} /> Actors
          </button>
          <button onClick={() => onNavigate("projects", { openForm: true })} className={navItemClass("projects")}>
            <PlusCircle size={14} /> Post
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex items-center gap-2 bg-background border-[1.5px] border-border rounded-full px-4 py-1.5 w-60 focus-within:border-primary transition-colors">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-foreground font-body text-xs w-full placeholder:text-muted-foreground/50"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-primary transition-all duration-300 border border-transparent hover:border-foreground/10"
              title="Toggle color theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={onMessagesClick}
                  className="flex p-2 md:p-2.5 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-primary transition-all relative border border-transparent hover:border-foreground/10"
                  title="Direct Messages"
                >
                  <MessageSquare size={18} className={`transition-colors ${unreadMsgCount > 0 ? "text-primary shadow-[0_0_10px_hsl(var(--gold)/0.4)]" : "text-muted-foreground"}`} />
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
              </div>
            )}
          </div>

          {!isPro && (
            <button
              onClick={onPremiumClick}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 transition-colors font-body font-normal text-[0.6rem] uppercase tracking-wider"
            >
              <Crown className="w-3.5 h-3.5" />
              Upgrade
            </button>
          )}

          <button
            onClick={onAuthClick}
            className={`relative px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-accent font-bold text-[0.6rem] sm:text-[0.65rem] uppercase tracking-[0.15em] transition-all duration-500 flex items-center gap-2 ${isPro
              ? "border border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              : "bg-primary text-primary-foreground hover:opacity-90 hover:scale-105 shadow-xl shadow-primary/30"
              }`}
          >
            {isPro && <Crown size={12} className="animate-pulse" />}
            {user ? (isPro ? (isMobile ? "PRO" : "PRO DASHBOARD") : "MY STAGE") : "JOIN"}
          </button>

          <button
            onClick={onMenuClick}
            className="px-3 py-1.5 rounded-full bg-secondary/20 text-muted-foreground hover:text-primary transition-colors hover:bg-secondary flex items-center gap-2"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden lg:inline text-[0.65rem] font-medium uppercase tracking-widest">More</span>
          </button>
        </div>
      </div>

      {/* Mobile-only search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center gap-2 bg-secondary/30 border border-border rounded-full px-4 py-2 focus-within:border-primary transition-all">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-foreground font-body text-xs w-full placeholder:text-muted-foreground/50"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </nav>
  );
}
