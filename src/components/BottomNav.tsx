import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";
import { PageName } from "./AppDrawer";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavProps {
  activePage: PageName;
  onNavigate: (page: PageName, options?: { searchType?: "talents" | "projects", openForm?: boolean }) => void;
}

export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  const { user } = useAuth();
  
  if (!user) return null;

  const items: { id: PageName; icon: any; label: string }[] = [
    { id: "home", icon: Home, label: "HOME" },
    { id: "feed", icon: Search, label: "EXPLORE" },
  ];

  if (user) {
    items.push(
      { id: "projects", icon: Plus, label: "Post" },
      { id: "messages", icon: MessageSquare, label: "Messages" },
      { id: "profile", icon: User, label: "Profile" }
    );
  }

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 w-full z-[400] bg-[#121826]/80 backdrop-blur-[20px] border-t border-white/5 pb-safe px-6 h-18 sm:h-20 flex items-center shadow-[0_-10px_30px_rgba(0,0,0,0.4)] ${user ? 'justify-between' : 'justify-evenly'}`}>
      {items.map((item) => {
        const isActive = activePage === item.id;
        const isPlus = item.id === "projects";

        if (isPlus) {
          return (
            <button
              key={item.id}
              onClick={() => onNavigate("projects", { openForm: true })}
              className="relative -top-1 w-12 h-12 md:w-14 md:h-14 bg-[#D4AF37] rounded-full flex items-center justify-center text-[#0B0F1A] shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all active:scale-90 scale-110"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 min-w-[3.5rem] transition-all active:scale-95 ${isActive ? "text-[#D4AF37]" : "text-[#9AA4B2]"}`}
          >
            <item.icon size={22} fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
