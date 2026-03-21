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
    flex items-center gap-2 px-4 py-1.5 rounded-full text-[0.7rem] uppercase tracking-wider font-medium transition-all
    ${activePage === id && (!currentSearchType || searchType === currentSearchType) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
  `;

  return (
    <nav className="sticky top-0 bg-background/60 backdrop-blur-xl z-50 border-b border-white/5">
      <div className="flex items-center justify-between px-4 md:px-8 h-16 max-w-[1800px] mx-auto">
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

        {/* Center Links - Desktop Only */}
        <div className="hidden lg:flex items-center gap-2">
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
            <PlusCircle size={14} /> Post Casting
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
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all duration-300"
              title="Toggle color theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user && (
              <>
                <button
                  onClick={onMessagesClick}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all relative"
                  title="Direct Messages"
                >
                  <MessageSquare className={`w-4 h-4 transition-colors ${unreadMsgCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-background animate-pulse" />
                  )}
                </button>

                <button
                  onClick={onNotificationClick}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-background animate-pulse" />
                  )}
                </button>
              </>
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
            className={`relative px-4 py-1.5 rounded-full font-body font-medium text-[0.7rem] uppercase tracking-wider transition-all flex items-center gap-2 ${isPro
              ? "border-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/5 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]"
              : "bg-primary text-primary-foreground hover:opacity-85 shadow-lg shadow-primary/20"
              }`}
          >
            {isPro && <Crown className="w-3.5 h-3.5" />}
            {user ? (isPro ? "PRO" : "Account") : "Sign In"}
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
