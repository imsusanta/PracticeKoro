import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Share,
  Plus,
  CheckCircle,
  Apple,
  Smartphone,
  ArrowLeft,
  Wifi,
  Zap,
  Bell,
  Shield,
  Chrome,
  Sparkles,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  const [diag, setDiag] = useState({
    https: false,
    sw: false,
    manifest: false,
    prompt: false
  });

  const [browserInfo, setBrowserInfo] = useState<{ name: string; icon: any } | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform & browser
    const ua = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isChrome = /chrome/.test(ua) && !/edge|opr/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    if (isSafari) setBrowserInfo({ name: "Safari", icon: Smartphone });
    else if (isChrome) setBrowserInfo({ name: "Chrome", icon: Chrome });
    else setBrowserInfo({ name: "Browser", icon: Smartphone });

    // Diagnostics
    const checkDiag = async () => {
      const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost";
      const hasSW = "serviceWorker" in navigator;
      const swReg = hasSW ? await navigator.serviceWorker.getRegistration() : null;

      let hasManifest = false;
      try {
        const resp = await fetch("/manifest.json");
        hasManifest = resp.ok;
      } catch (e) {
        // Manifest check failed, which is expected in some environments
        console.debug('Manifest check failed:', e);
      }

      setDiag({
        https: isHttps,
        sw: !!swReg,
        manifest: hasManifest,
        prompt: !!deferredPrompt
      });
    };

    checkDiag();

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDiag(prev => ({ ...prev, prompt: true }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setInstalling(false);
  };

  const features = [
    { icon: Wifi, title: "Works Offline", description: "Access tests without internet", color: "from-blue-500 to-cyan-500" },
    { icon: Sparkles, title: "Speed+", description: "Native app-like performance", color: "from-amber-500 to-orange-500" },
    { icon: Bell, title: "Notifications", description: "Test & result alerts", color: "from-purple-500 to-pink-500" },
    { icon: Shield, title: "Premium UI", description: "Full-screen experience", color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-violet-50/50 relative overflow-hidden">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 32px)', paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}>
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center mb-6 hover:shadow-lg transition-shadow"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </motion.button>

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white flex items-center justify-center p-4 shadow-xl shadow-indigo-500/10">
              <img src="/favicon.svg" alt="Practice Koro Logo" className="w-full h-full object-contain" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-black text-slate-900 mb-1">Install App</h1>
          <p className="text-slate-500 text-xs">Practice Koro Premium Experience</p>
        </motion.div>

        {/* System Diagnostic Check */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-indigo-500/5 mb-6"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Environment Check
            </h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              {browserInfo && <browserInfo.icon className="w-3 h-3 text-slate-400" />}
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{browserInfo?.name || "Checking..."}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Connection", ok: diag.https, desc: "Secure HTTPS" },
              { label: "Engine", ok: diag.sw, desc: "Service Worker" },
              { label: "Configuration", ok: diag.manifest, desc: "App Manifest" },
              { label: "Compatibility", ok: diag.prompt || isIOS || browserInfo?.name === "Safari", desc: "Install Support" },
            ].map((item) => (
              <div key={item.label} className={`flex flex-col gap-1 p-3 rounded-2xl border transition-colors ${item.ok ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${item.ok ? 'text-emerald-700' : 'text-red-700'}`}>{item.label}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-red-500'} ${!item.ok ? 'animate-pulse' : ''}`} />
                </div>
                <span className="text-[8px] text-slate-400 font-medium leading-none">{item.desc}</span>
              </div>
            ))}
          </div>

          {!diag.https && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 flex gap-2 items-start">
              <X className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-red-700 font-medium leading-normal italic">
                PWA installation requires a secure (HTTPS) connection. If you are on a local network, please use localhost or a secure tunnel.
              </p>
            </div>
          )}
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-4 gap-2 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/10`}>
                <feature.icon className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-black text-slate-900 text-[9px] uppercase tracking-tighter text-center">{feature.title}</h4>
            </motion.div>
          ))}
        </motion.div>

        {/* Installation instructions based on platform */}
        {!isInstalled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1"
          >
            {/* Android/Chrome - Direct install */}
            {deferredPrompt && !isIOS && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xl shadow-indigo-500/10 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <Download className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">Instant Install</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Add to home screen now</p>
                  </div>
                </div>

                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-2xl py-7 text-base shadow-xl shadow-indigo-500/30 transition-all active:scale-95"
                >
                  {installing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Installing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Install Practice Koro
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Manual Instructions (iOS or Failed Direct Install) */}
            {(!deferredPrompt || isIOS || browserInfo?.name === "Safari") && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xl shadow-indigo-500/10 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />

                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                    {isIOS || browserInfo?.name === "Safari" ? <Apple className="w-6 h-6 text-white" /> : <Smartphone className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">Manual Install</h3>
                    <p className="text-[11px] text-slate-500 font-medium italic">Required for {browserInfo?.name || 'this browser'}</p>
                  </div>
                </div>

                {/* Android/Chrome Instructions */}
                {isAndroid && !isIOS && (
                  <div className="space-y-5 mb-6">
                    {[
                      {
                        step: "1",
                        icon: Chrome,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        title: "Tap ⋮ Menu",
                        desc: "Find the 3 dots (⋮) in the top-right corner of your browser."
                      },
                      {
                        step: "2",
                        icon: Download,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                        title: "Find 'Install App' or 'Add to Home'",
                        desc: "Look for 'Install app', 'Add to Home screen' or 'Install Practice Koro'."
                      },
                      {
                        step: "3",
                        icon: CheckCircle,
                        color: "text-purple-600",
                        bg: "bg-purple-50",
                        title: "Confirm Install",
                        desc: "Tap 'Install' or 'Add' to complete the installation."
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 group">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 shadow-sm border border-white transition-transform group-hover:scale-110`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-tight mb-1">{item.title}</p>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* iOS/Safari Instructions */}
                {(isIOS || browserInfo?.name === "Safari") && (
                  <div className="space-y-5">
                    {[
                      {
                        step: "1",
                        icon: Share,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                        title: "Tap Share",
                        desc: "Find this icon in your browser's bottom or top menu."
                      },
                      {
                        step: "2",
                        icon: Plus,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                        title: "Add to Home Screen",
                        desc: "Scroll down the menu to find this magic button."
                      },
                      {
                        step: "3",
                        icon: CheckCircle,
                        color: "text-purple-600",
                        bg: "bg-purple-50",
                        title: "Confirm 'Add'",
                        desc: "Tap 'Add' in the top right corner to finish."
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 group">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 shadow-sm border border-white transition-transform group-hover:scale-110`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-tight mb-1">{item.title}</p>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tips for Android users who can't install */}
                {isAndroid && !deferredPrompt && (
                  <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                    <p className="text-[10px] text-amber-700 font-black flex items-center gap-2 uppercase tracking-tight">
                      💡 না পাচ্ছেন?
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1 leading-normal">
                      Chrome browser এ open করুন: Chrome এ সবথেকে ভালো PWA support আছে। Samsung/Mi browser এ কাজ না করলে Chrome try করুন।
                    </p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50">
                  <p className="text-[10px] text-indigo-700 font-black flex items-center gap-2 uppercase tracking-tight">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pro Tip
                  </p>
                  <p className="text-[11px] text-indigo-600 font-medium mt-1 leading-normal italic">
                    Once added, the app will appear on your home screen just like a native app from the Play Store or App Store!
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-auto pt-6 text-center"
        >
          <p className="text-xs text-slate-400">
            Practice Koro • Your exam preparation partner
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Install;
