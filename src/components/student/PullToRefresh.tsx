import { useState, useRef, useCallback, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useAnimation } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PULL_THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    // Only start pull-to-refresh if scrolled to top
    const scrollTop = scrollContainer.scrollTop || window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      // Apply resistance - pull gets harder as you go further
      const resistance = Math.min(diff * 0.4, 120);
      setPullDistance(resistance);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD * 0.4 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50); // Hold at indicator position
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull Indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
        style={{
          height: pullDistance > 0 || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px` : '0px',
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
        }}
      >
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : (pullDistance / PULL_THRESHOLD) * 180,
          }}
          transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
          className="flex items-center justify-center"
        >
          <RefreshCw
            className={`w-5 h-5 transition-colors ${
              pullDistance >= PULL_THRESHOLD * 0.4 || isRefreshing
                ? "text-emerald-500"
                : "text-slate-300"
            }`}
          />
        </motion.div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullDistance > 0 && !isRefreshing ? `translateY(0px)` : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
