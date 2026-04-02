import { X, Download, Home, Search as SearchIcon, Users, Play, PlusCircle, Briefcase, User, Crown, Bell, MessageSquare, Settings, Bookmark, HelpCircle, ShieldCheck, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export type PageName =
  | "home" | "auth" | "profile" | "search" | "feed"
  | "projects" | "notifications" | "messages"
  | "settings" | "saved" | "analytics"
  | "help" | "terms" | "premium" | "admin" | "category";

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => void;
}

export default function AppDrawer({ open, onClose, onNavigate }: AppDrawerProps) {
  const { user, profile, loading, isPremium, signOut } = useAuth();
  const { t } = useTranslation();

  const initials = loading 
    ? "" 
    : (profile?.name || user?.email || "?")
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2);

  const go = (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => {
    // Primary navigation action
    onNavigate(page, options);
    // Slight delay before closing to ensure the tap is registered and nav starts
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
    onNavigate("home");
    toast.success("Signed out successfully");
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/65 z-[200] transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-[100dvh] w-[320px] max-w-[90vw] glass-card z-[300] flex flex-col transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)] shadow-[-20px_0_40px_rgba(0,0,0,0.5)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex-shrink-0 px-8 pt-10 pb-6 border-b border-foreground/5 flex items-center gap-5 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-muted-foreground/40 hover:text-primary transition-all hover:scale-110 p-2"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center font-display text-2xl text-primary flex-shrink-0 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            ) : profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-foreground/40 italic">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg text-foreground font-bold truncate">
              {loading ? t('settings.profile.processing') : (profile?.name || (user ? "Account" : "Guest"))}
            </div>
            <div className="text-[0.7rem] text-foreground/80 font-bold uppercase tracking-[0.12em] mt-1 truncate">
              {loading ? "Please wait" : (profile?.role || (user ? "Member" : "Not signed in"))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 custom-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
          <Section label="Explore">
            <Item onClick={() => go("home")}>{t('nav.home')}</Item>
            <Item onClick={() => go("feed")}>{t('nav.feed')}</Item>
          </Section>
          
          <Hr />
          
          <Section label="Workspace">
            <Item onClick={() => go("projects", { openForm: true })}>Post a Casting</Item>
            <Item onClick={() => go("projects")}>Manage Applications</Item>
          </Section>

          <Hr />

          <Section label="Account">
            <Item onClick={() => go("profile")}>{t('nav.profile')}</Item>
            {!isPremium && <Item onClick={() => go("premium")}>Premium Upgrade</Item>}
            <Item onClick={() => go("notifications")}>Notifications</Item>
            <Item onClick={() => go("messages")}>Messages</Item>
          </Section>

          <Hr />

          <Section label="System">
            {profile?.role === "Admin" && (
              <Item onClick={() => go("admin")}>Admin Panel</Item>
            )}
            <Item onClick={() => go("settings")}>{t('nav.settings')}</Item>
            <Item onClick={() => go("saved")}>Saved Items</Item>
          </Section>

          <Hr />

          <Section label="Support">
            <Item onClick={() => go("help")}>Help & Support</Item>
            <Item onClick={() => go("terms")}>Terms & Privacy</Item>
            
            <a 
              href="/me.castingcall.app.apk" 
              download="CastingCall.apk"
              className="block w-full"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full text-left font-accent text-[0.7rem] font-bold uppercase tracking-[0.2em] px-5 py-4.5 rounded-2xl transition-all border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/5 hover:bg-primary/20"
              >
                Download App (Direct)
              </motion.button>
            </a>
          </Section>
        </div>

        {user && (
          <div className="flex-shrink-0 px-8 py-6 border-t border-foreground/5 mb-2">
            <button
              onClick={handleLogout}
              className="w-full border border-destructive/30 rounded-xl text-destructive font-display font-bold uppercase tracking-widest text-[0.6rem] py-4 text-center hover:bg-destructive hover:text-white transition-all active:scale-95"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-6 pb-2">
      <div className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground/30 mb-4 px-8">
        {label}
      </div>
      <div className="space-y-1 px-4">
        {children}
      </div>
    </div>
  );
}

interface ItemProps {
  children: React.ReactNode;
  onClick: () => void;
  highlight?: boolean;
}

function Item({ children, onClick, highlight }: ItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        block w-full text-left font-accent text-[0.7rem] font-bold uppercase tracking-[0.2em] px-5 py-4.5 rounded-2xl transition-all border border-transparent
        ${highlight 
          ? 'bg-primary/10 text-primary border-primary/20 shadow-lg shadow-primary/5' 
          : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground hover:border-foreground/10'}
      `}
    >
      {children}
    </motion.button>
  );
}

function Hr() {
  return <div className="h-px bg-foreground/5 mx-8 my-2" />;
}
