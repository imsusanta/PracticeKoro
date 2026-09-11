import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Sparkles, Share, Plus, ArrowRight, Chrome } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// Never interrupt auth flows: the prompt must not cover form controls
// or primary buttons on these routes.
const SUPPRESSED_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/admin/login",
];

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallPromptInner = () => {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSSteps, setShowIOSSteps] = useState(false);

    const [browserInfo, setBrowserInfo] = useState<{ name: string; icon: any } | null>(null);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        // Detect Platform & Browser
        const ua = navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
        const isChrome = /chrome/.test(ua) && !/edge|opr/.test(ua);
        const isFirefox = /firefox/.test(ua);
        const isSamsung = /samsungbrowser/.test(ua);

        setIsIOS(isIOSDevice);

        if (isSafari) setBrowserInfo({ name: "Safari", icon: Smartphone });
        else if (isChrome) setBrowserInfo({ name: "Chrome", icon: Chrome });
        else if (isFirefox) setBrowserInfo({ name: "Firefox", icon: Smartphone });
        else if (isSamsung) setBrowserInfo({ name: "Samsung Browser", icon: Smartphone });

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
        let isRecentlyDismissed = false;
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const hoursSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60);
            if (hoursSinceDismiss < 24) isRecentlyDismissed = true;
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show after a delay for better UX, but only if not recently dismissed
            if (!isRecentlyDismissed) {
                setTimeout(() => setShowPrompt(true), 4000);
            }
        };

        const handleManualTrigger = () => {
            setShowPrompt(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);
        window.addEventListener("show-pwa-prompt", handleManualTrigger);

        // For iOS or Safari, show prompt after delay if not recently dismissed (since native prompt won't fire)
        if ((isIOSDevice || isSafari) && !isRecentlyDismissed) {
            const timer = setTimeout(() => setShowPrompt(true), 4000);
            return () => {
                clearTimeout(timer);
                window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
                window.removeEventListener("show-pwa-prompt", handleManualTrigger);
            };
        }

        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowPrompt(false);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            window.removeEventListener("show-pwa-prompt", handleManualTrigger);
        };
    }, []);

    const handleInstall = async () => {
        if (isIOS || (browserInfo?.name === "Safari")) {
            setShowIOSSteps(true);
            return;
        }

        if (!deferredPrompt) {
            // Fallback: navigate to install page
            navigate("/install");
            return;
        }

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
        setShowPrompt(false);
        setShowIOSSteps(false);
    };

    const handleLearnMore = () => {
        setShowPrompt(false);
        navigate("/install");
    };

    if (isInstalled || !showPrompt) return null;

    return (
        <AnimatePresence>
            {showIOSSteps ? (
                // iOS Installation Steps
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-6 left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:max-w-sm z-[200] mb-[env(safe-area-inset-bottom)]"
                >
                    <div role="dialog" aria-label="Install Practice Koro app" className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
                        <button
                            onClick={handleDismiss}
                            aria-label="Dismiss install prompt"
                            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-500" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <Smartphone className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Install App</h3>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Share className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">1. Tap Share</p>
                                    <p className="text-[10px] text-slate-500">Find this icon in the browser menu</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Plus className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">2. Add to Home Screen</p>
                                    <p className="text-[10px] text-slate-500">Scroll down the menu to find it</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                    <ArrowRight className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">3. Confirm Installation</p>
                                    <p className="text-[10px] text-slate-500">Tap "Add" in the top right corner</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Got it!
                        </button>
                    </div>
                </motion.div>
            ) : (
                // Main Install Prompt
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-6 left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:max-w-sm z-[200] mb-[env(safe-area-inset-bottom)]"
                >
                    <div role="dialog" aria-label="Install Practice Koro app" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-4 shadow-2xl shadow-indigo-500/30 border border-white/10">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-400/20 rounded-full blur-xl -ml-12 -mb-12" />

                        <button
                            onClick={handleDismiss}
                            aria-label="Dismiss install prompt"
                            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-50"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>

                        <div className="relative z-10 flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
                                <Smartphone className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                        <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">Premium Experience</span>
                                    </div>
                                    {browserInfo && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
                                            <browserInfo.icon className="w-2.5 h-2.5 text-indigo-200" />
                                            <span className="text-[8px] font-black text-indigo-100 uppercase">{browserInfo.name}</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">Install Practice Koro</h3>
                                <p className="text-[11px] text-indigo-50 leading-relaxed">
                                    {isIOS || (browserInfo?.name === "Safari")
                                        ? "Add to home screen for the best experience!"
                                        : "Get instant access & native app experience!"
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 flex gap-2 mt-4">
                            <button
                                onClick={handleLearnMore}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/85 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Learn More
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleInstall}
                                className="flex-1 py-2.5 rounded-xl bg-white text-indigo-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {isIOS || (browserInfo?.name === "Safari") ? "How to Install" : "Install Now"}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const PWAInstallPrompt = () => {
    const { pathname } = useLocation();
    if (SUPPRESSED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
        return null;
    }
    return <PWAInstallPromptInner />;
};

export default PWAInstallPrompt;
