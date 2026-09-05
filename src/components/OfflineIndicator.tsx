import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showIndicator, setShowIndicator] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowIndicator(true);
            setTimeout(() => setShowIndicator(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowIndicator(true);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Show initial offline state
        if (!navigator.onLine) {
            setShowIndicator(true);
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {showIndicator && (
                <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-2 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-full shadow-xl"
                    style={{
                        background: isOnline
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "linear-gradient(135deg, #ef4444, #dc2626)",
                    }}
                >
                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <>
                                <Wifi className="w-4 h-4 text-white" />
                                <span className="text-xs font-bold text-white">Back Online!</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4 text-white" />
                                <span className="text-xs font-bold text-white">You're Offline</span>
                                <button
                                    type="button"
                                    aria-label="Retry connection"
                                    onClick={() => window.location.reload()}
                                    className="ml-1 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3 text-white" />
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineIndicator;
