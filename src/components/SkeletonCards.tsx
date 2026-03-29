import { motion } from "framer-motion";

/** Talent Card Skeleton — matches the exact layout of talent cards in HomePage/SearchPage */
export function TalentCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-8 max-w-[700px] mx-auto w-full">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08 }}
          className="relative bg-card border border-border rounded-[1.8rem] p-6 flex flex-col items-center"
        >
          {/* Avatar */}
          <div className="skeleton skeleton-circle w-24 h-24 mb-5" />
          {/* Name */}
          <div className="skeleton skeleton-text w-36 mb-2" />
          {/* Role */}
          <div className="skeleton skeleton-text-sm w-20 mb-6" />
          {/* Bio */}
          <div className="skeleton skeleton-text w-full mb-2" />
          <div className="skeleton skeleton-text w-4/5 mb-8" />
          {/* Divider */}
          <div className="w-full h-px bg-border mb-4" />
          {/* Meta row */}
          <div className="w-full flex items-center justify-between mb-4">
            <div className="skeleton skeleton-text-sm w-16" />
            <div className="skeleton skeleton-text-sm w-12" />
            <div className="skeleton skeleton-text-sm w-14" />
          </div>
          <div className="skeleton skeleton-text-sm w-16" />
        </motion.div>
      ))}
    </div>
  );
}

/** Category Card Skeleton — matches glassmorphic category cards */
export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="h-44 md:h-56 rounded-3xl md:rounded-[2rem] bg-card border border-border p-4 md:p-8 flex flex-col items-center justify-between"
        >
          <div className="skeleton w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem]" />
          <div className="w-full text-center space-y-2">
            <div className="skeleton skeleton-text w-3/4 mx-auto" />
            <div className="skeleton skeleton-text-sm w-1/2 mx-auto" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Conversation List Skeleton — matches MessagesPage sidebar */
export function ConversationSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-3 py-3 flex items-center gap-3">
          <div className="skeleton skeleton-circle w-14 h-14 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton skeleton-text w-24" />
            <div className="skeleton skeleton-text-sm w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stats Skeleton — matches glassmorphic stats section */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-stat flex flex-col items-center space-y-3">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="skeleton skeleton-text w-16 mx-auto" style={{ height: '2rem' }} />
          <div className="skeleton skeleton-text-sm w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/** Bento Grid Skeleton */
export function BentoSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bento-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton rounded-[1.5rem] ${i === 0 ? 'bento-featured' : ''}`} style={{ minHeight: i === 0 ? 300 : 200 }} />
      ))}
    </div>
  );
}

/** Search Result Skeleton */
export function SearchResultSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className="bg-card border border-border rounded-[1.8rem] p-5 flex items-center gap-5"
        >
          <div className="skeleton skeleton-circle w-16 h-16 md:w-20 md:h-20 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton skeleton-text w-32" />
            <div className="skeleton skeleton-text-sm w-20" />
            <div className="flex gap-3 mt-2">
              <div className="skeleton skeleton-text-sm w-14" />
              <div className="skeleton skeleton-text-sm w-16" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
