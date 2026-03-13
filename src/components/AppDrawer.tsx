import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PageName =
  | "home" | "auth" | "profile" | "search" | "feed"
  | "projects" | "notifications" | "messages"
  | "settings" | "saved" | "analytics"
  | "help" | "terms" | "premium" | "admin";

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => void;
}

export default function AppDrawer({ open, onClose, onNavigate }: AppDrawerProps) {
  const { user, profile, loading, isPremium, signOut } = useAuth();

  const initials = loading 
    ? "" 
    : (profile?.name || user?.email || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

  const go = (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => {
    onNavigate(page, options);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
    onNavigate("home");
    toast.success("Signed out successfully");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/65 z-[200] transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Drawer — 3-layer: sticky header | scrollable content | sticky footer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-[300px] max-w-full bg-card border-l border-border z-[300] flex flex-col transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${open ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* ── Sticky Header ── */}
        <div className="flex-shrink-0 px-6 pt-8 pb-5 border-b border-border flex items-center gap-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-[52px] h-[52px] rounded-full bg-secondary border-2 border-primary flex items-center justify-center font-display text-xl text-primary flex-shrink-0 overflow-hidden">
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            ) : profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="font-normal text-sm text-foreground truncate">
              {loading ? "Syncing..." : (profile?.name || (user ? "Account" : "Guest"))}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {loading ? "Please wait" : (profile?.role || (user ? "Member" : "Not signed in"))}
            </div>
          </div>
        </div>

        {/* ── Scrollable Nav Items ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <Section label="Explore">
            <Item onClick={() => go("home")}>Home</Item>
            <Item onClick={() => go("search", { searchType: "projects" })}>Casting Calls</Item>
            <Item onClick={() => go("search", { searchType: "talents" })}>Find Actors</Item>
            <Item onClick={() => go("feed")}>Feed</Item>
          </Section>
          <Hr />
          <Section label="Workspace">
            <Item onClick={() => go("projects", { openForm: true })}>Post a Casting</Item>
            <Item onClick={() => go("projects")}>Manage Applications</Item>
          </Section>
          <Hr />
          <Section label="Account">
            <Item onClick={() => go("profile")}>My Profile</Item>
            {!isPremium && <Item onClick={() => go("premium")}>Premium Upgrade</Item>}
            <Item onClick={() => go("notifications")}>Notifications</Item>
            <Item onClick={() => go("messages")}>Messages</Item>
          </Section>
          <Hr />
          <Section label="System">
            {profile?.role === "Admin" && (
              <Item onClick={() => go("admin")}>
                <span className="text-primary font-normal">Admin Panel</span>
              </Item>
            )}
            <Item onClick={() => go("settings")}>Settings</Item>
            <Item onClick={() => go("saved")}>Saved Talents</Item>
          </Section>
          <Hr />
          <Section label="Support">
            <Item onClick={() => go("help")}>Help & Support</Item>
            <Item onClick={() => go("terms")}>Terms & Privacy</Item>
          </Section>
        </div>

        {/* ── Sticky Footer — Log Out ── */}
        {user && (
          <div className="flex-shrink-0 px-6 py-5 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full border-[1.5px] border-border rounded-lg text-destructive font-body font-normal text-sm py-3 text-center hover:bg-destructive/10 hover:border-destructive transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 pt-4 pb-1">
      <div className="text-[0.65rem] font-normal tracking-[1.6px] uppercase text-muted-foreground/40 mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function Item({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left text-muted-foreground font-body text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-secondary hover:text-primary transition-colors"
    >
      {children}
    </button>
  );
}

function Hr() {
  return <div className="h-px bg-border mx-6 my-1" />;
}
