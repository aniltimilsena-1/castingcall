import { Search, Moon, Sun, Menu, Crown, Bell, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";

interface NavbarProps {
  onSearch: (term: string) => void;
  onAuthClick: () => void;
  onMenuClick: () => void;
  onLogoClick: () => void;
  onPremiumClick: () => void;
  onNotificationClick: () => void;
  onMessagesClick: () => void;
}

export default function Navbar({ onSearch, onAuthClick, onMenuClick, onLogoClick, onPremiumClick, onNotificationClick, onMessagesClick }: NavbarProps) {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchValue, setSearchValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase.from("notifications" as any).select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_read", false);
      setUnreadCount(count || 0);
    };

    const fetchUnreadMessages = async () => {
      const { count } = await supabase.from("messages").select("*", { count: 'exact', head: true }).eq("receiver_id", user.id).eq("is_read", false);
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

  return (
    <nav className="sticky top-0 bg-background z-50 border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        <button onClick={onLogoClick} className="flex items-center group">
          <img
            src="/logo.png"
            alt="CastingCall Logo"
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="font-display text-3xl text-primary tracking-wider">CastingCall</span>';
            }}
          />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-background border-[1.5px] border-border rounded-full px-4 py-2 w-80 focus-within:border-primary transition-colors">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search profiles… press Enter"
            className="bg-transparent border-none outline-none text-foreground font-body text-sm w-full placeholder:text-muted-foreground/50"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all duration-300 mr-1"
            title="Toggle color theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user && (
            <div className="flex items-center gap-1">
              <button
                onClick={onMessagesClick}
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all relative"
                title="Direct Messages"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMsgCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </button>

              <button
                onClick={onNotificationClick}
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background animate-pulse" />
                )}
              </button>
            </div>
          )}

          {!isPro && (
            <button
              onClick={onPremiumClick}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors font-body font-normal text-xs uppercase tracking-wider"
            >
              <Crown className="w-4 h-4" />
              Premium
            </button>
          )}

          <button
            onClick={onAuthClick}
            className={`relative px-4 py-2 rounded-lg font-body font-normal text-sm transition-all flex items-center gap-2 ${isPro
              ? "border-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/5 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]"
              : "bg-primary text-primary-foreground hover:opacity-85"
              }`}
          >
            {isPro && <Crown className="w-3.5 h-3.5" />}
            {user ? (isPro ? "PRO Account" : "My Account") : "Sign In"}
          </button>

          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-muted-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile-only search bar */}
      <div className="sm:hidden px-4 pb-3">
        <div className="flex items-center gap-2 bg-secondary/30 border border-border rounded-full px-4 py-2.5 focus-within:border-primary transition-colors">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search profiles…"
            className="bg-transparent border-none outline-none text-foreground font-body text-sm w-full placeholder:text-muted-foreground/50"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </nav>
  );
}
