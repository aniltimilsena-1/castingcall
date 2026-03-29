import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Film, Home, Sparkles, MessageSquare, Settings, X, ArrowRight, Command } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommandCenterProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: any) => void;
  onProfileClick: (profile: any) => void;
}

interface SearchResult {
  id: string;
  name: string;
  role?: string;
  photo_url?: string;
  type: "talent" | "page";
  action?: () => void;
}

const QUICK_LINKS = [
  { id: "home",     label: "Home",         icon: Home,         page: "home" },
  { id: "search",   label: "Search",       icon: Search,       page: "search" },
  { id: "feed",     label: "Explore Feed", icon: Sparkles,     page: "feed" },
  { id: "messages", label: "Messages",     icon: MessageSquare,page: "messages" },
  { id: "settings", label: "Settings",     icon: Settings,     page: "settings" },
];

export default function CommandCenter({ open, onClose, onNavigate, onProfileClick }: CommandCenterProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, name, role, photo_url")
        .or(`name.ilike.%${q}%,role.ilike.%${q}%`)
        .limit(6);

      const talentResults: SearchResult[] = (data || []).map((p) => ({
        id: p.id,
        name: p.name || "Unknown",
        role: p.role,
        photo_url: p.photo_url,
        type: "talent",
      }));
      setResults(talentResults);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const list = query ? results : QUICK_LINKS.map(l => ({ id: l.id, name: l.label, type: "page" as const }));
    const total = list.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIndex(i => (i + 1) % total); }
      if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIndex(i => (i - 1 + total) % total); }
      if (e.key === "Escape")     { onClose(); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (query && results[activeIndex]) {
          const r = results[activeIndex];
          if (r.type === "talent") { onProfileClick(r); onClose(); }
        } else if (!query && QUICK_LINKS[activeIndex]) {
          onNavigate(QUICK_LINKS[activeIndex].page);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, query, results, activeIndex, onClose, onNavigate, onProfileClick]);

  const handleTalentClick = (r: SearchResult) => {
    onProfileClick({ id: r.id, name: r.name, role: r.role, photo_url: r.photo_url });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmd-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="cmd-backdrop"
          onClick={onClose}
        >
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 420 }}
            className="cmd-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
              <Search size={16} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                placeholder="Search talents, roles, projects..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-mono-tech"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem" }}
              />
              <div className="flex items-center gap-1.5 text-muted-foreground/40">
                {loading
                  ? <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                  : query
                    ? <button onClick={() => setQuery("")} className="p-0.5 hover:text-muted-foreground"><X size={12} /></button>
                    : <kbd className="font-mono-tech text-[0.55rem] px-1.5 py-0.5 rounded border border-white/10 bg-white/5">ESC</kbd>
                }
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto py-2">
              {/* No query — show quick nav */}
              {!query && (
                <div>
                  <div className="px-5 pt-2 pb-1.5">
                    <span className="font-mono-tech text-[0.55rem] text-muted-foreground/40 uppercase tracking-[0.2em]">Quick Navigation</span>
                  </div>
                  {QUICK_LINKS.map((link, i) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.id}
                        onClick={() => { onNavigate(link.page); onClose(); }}
                        className={`w-full flex items-center gap-4 px-5 py-3 transition-colors text-left ${activeIndex === i ? "bg-primary/8 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                        onMouseEnter={() => setActiveIndex(i)}
                      >
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${activeIndex === i ? "border-primary/30 bg-primary/10 text-primary" : "border-white/8 bg-white/5"}`}>
                          <Icon size={14} />
                        </div>
                        <span className="text-sm font-medium">{link.label}</span>
                        {activeIndex === i && <ArrowRight size={12} className="ml-auto text-primary/60" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Query results */}
              {query && results.length > 0 && (
                <div>
                  <div className="px-5 pt-2 pb-1.5">
                    <span className="font-mono-tech text-[0.55rem] text-muted-foreground/40 uppercase tracking-[0.2em]">Talent Results</span>
                  </div>
                  {results.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => handleTalentClick(r)}
                      className={`w-full flex items-center gap-4 px-5 py-3 transition-colors text-left ${activeIndex === i ? "bg-primary/8 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-secondary flex-shrink-0 flex items-center justify-center">
                        {r.photo_url
                          ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" />
                          : <User size={14} className="text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                        {r.role && <div className="font-mono-tech text-[0.6rem] text-primary/60 uppercase">{r.role}</div>}
                      </div>
                      {activeIndex === i && <ArrowRight size={12} className="ml-auto text-primary/60 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {query && !loading && results.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <Film size={20} className="text-muted-foreground/20 mx-auto mb-2" />
                  <p className="font-mono-tech text-[0.65rem] text-muted-foreground/40">No results for "{query}"</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-white/8 px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono-tech text-[0.55rem] text-muted-foreground/30 flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-white/8 bg-white/4">↑↓</kbd> navigate
                </span>
                <span className="font-mono-tech text-[0.55rem] text-muted-foreground/30 flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-white/8 bg-white/4">↵</kbd> open
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/20">
                <Command size={9} />
                <span className="font-mono-tech text-[0.5rem]">K</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
