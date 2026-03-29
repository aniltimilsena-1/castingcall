import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Check } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const pullY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const isNative = typeof (window as any)?.Capacitor?.isNative !== "undefined";
  if (!isNative && !("ontouchstart" in window)) return <div className={className}>{children}</div>;

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const ringProgress = useTransform(pullY, [0, THRESHOLD], [0, 1]);
  const ringScale = useTransform(pullY, [0, THRESHOLD], [0.3, 1]);
  const ringOpacity = useTransform(pullY, [0, 20], [0, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 5) return;
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || refreshing) return;
    const delta = Math.max(0, e.touches[0].clientY - startYRef.current);
    const dampened = Math.min(MAX_PULL, delta * 0.5);
    pullY.set(dampened);
  }, [pullY, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    
    if (pullY.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      // Hold at threshold while refreshing
      animate(pullY, THRESHOLD, { duration: 0.2 });
      
      try {
        // Haptic feedback
        try { (window as any).Capacitor?.Plugins?.Haptics?.impact?.({ style: "medium" }); } catch {}
        await onRefresh();
        setCompleted(true);
        setTimeout(() => setCompleted(false), 800);
      } finally {
        setRefreshing(false);
        animate(pullY, 0, { type: "spring", stiffness: 200, damping: 25 });
      }
    } else {
      animate(pullY, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  }, [pullY, refreshing, onRefresh]);

  return (
    <div className={`relative ${className || ""}`}>
      {/* Gold ring indicator */}
      <motion.div
        style={{ opacity: ringOpacity, y: useTransform(pullY, [0, THRESHOLD], [-20, 10]) }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
      >
        <motion.div
          style={{ scale: ringScale }}
          className="w-10 h-10 relative"
        >
          {completed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Check size={20} className="text-primary" />
            </motion.div>
          ) : (
            <svg viewBox="0 0 32 32" className="w-full h-full">
              <circle
                cx="16" cy="16" r="14"
                fill="none"
                stroke="hsl(0 0% 100% / 0.1)"
                strokeWidth="2"
              />
              <motion.circle
                cx="16" cy="16" r="14"
                fill="none"
                stroke="hsl(47 92% 52%)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="88"
                style={{ strokeDashoffset: useTransform(ringProgress, [0, 1], [88, 0]) }}
                className={refreshing ? "animate-spin origin-center" : ""}
              />
            </svg>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        ref={containerRef}
        style={{ y: useTransform(pullY, v => v * 0.3) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto"
      >
        {children}
      </motion.div>
    </div>
  );
}
