import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PageName =
  | "home" | "auth" | "profile" | "search"
  | "projects" | "notifications" | "messages"
  | "settings" | "saved" | "analytics"
  | "help" | "terms" | "premium";

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageName) => void;
}

export default function AppDrawer({ open, onClose, onNavigate }: AppDrawerProps) {
  const { user, profile, signOut } = useAuth();

  const initials = (profile?.name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const go = (page: PageName) => {
    onNavigate(page);
    onClose();
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out. See you soon!");
    onClose();
    onNavigate("home");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/65 z-[200] transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-[300px] max-w-full bg-card border-l border-border z-[300] flex flex-col overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${open ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-5 border-b border-border flex items-center gap-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-[52px] h-[52px] rounded-full bg-secondary border-2 border-primary flex items-center justify-center font-display text-xl text-primary flex-shrink-0 overflow-hidden">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">
              {profile?.name || "Guest"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {profile?.role || (user ? "Member" : "Not signed in")}
            </div>
          </div>
        </div>

        {/* Sections */}
        <Section label="Account">
          <Item onClick={() => go("profile")}>My Profile</Item>
          <Item onClick={() => go("premium")}>Premium</Item>
          <Item onClick={() => go("projects")}>My Projects</Item>
          <Item onClick={() => go("notifications")}>Notifications</Item>
          <Item onClick={() => go("messages")}>Messages</Item>
        </Section>
        <Hr />
        <Section label="General">
          <Item onClick={() => go("settings")}>Settings</Item>
          <Item onClick={() => go("saved")}>Saved Talents</Item>
          <Item onClick={() => go("analytics")}>Analytics</Item>
        </Section>
        <Hr />
        <Section label="Support">
          <Item onClick={() => go("help")}>Help & Support</Item>
          <Item onClick={() => go("terms")}>Terms & Privacy</Item>
        </Section>
        <Hr />

        {user && (
          <button
            onClick={handleLogout}
            className="mx-6 mb-6 mt-auto border-[1.5px] border-border rounded-lg text-destructive font-body font-semibold text-sm py-3 text-center hover:bg-destructive/10 hover:border-destructive transition-colors"
          >
            Log Out
          </button>
        )}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 pt-4 pb-1">
      <div className="text-[0.65rem] font-bold tracking-[1.6px] uppercase text-muted-foreground/40 mb-1">
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
