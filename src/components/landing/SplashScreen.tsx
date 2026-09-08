import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Start exit animation after 500ms (reduced for faster loading)
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 500);

        // Complete and unmount after exit animation (reduced for faster loading)
        const completeTimer = setTimeout(() => {
            onComplete();
        }, 800);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50"
                >
                    {/* Background decorative elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-emerald-200/50 to-teal-200/30 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-br from-teal-200/40 to-emerald-200/30 rounded-full blur-3xl"
                        />
                    </div>

                    {/* Logo and brand container */}
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Animated Graduation Cap Icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                duration: 0.8,
                            }}
                            className="relative mb-6"
                        >
                            {/* Main icon container */}
                            <motion.div
                                className="relative w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center p-4 shadow-xl shadow-blue-500/25 text-white"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14">
                                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                                </svg>
                            </motion.div>
                        </motion.div>

                        {/* Brand name with staggered animation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                            className="text-center"
                        >
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                Practice<span className="text-blue-600">Koro</span>
                            </h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                className="text-slate-500 text-xs sm:text-sm font-semibold mt-1.5"
                            >
                                Your Exam Preparation Partner
                            </motion.p>
                        </motion.div>

                        {/* Bengali Quote matching Screen 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            className="mt-12 text-center"
                        >
                            <p className="text-blue-900 font-bold text-base sm:text-lg font-bengali leading-snug">
                                প্রস্তুতি আজ <br />
                                <span className="text-blue-600 font-extrabold">সাফল্য আগামী কাল</span>
                            </p>
                        </motion.div>

                        {/* Loading indicator */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8, duration: 0.4 }}
                            className="mt-8 flex items-center gap-2"
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.15,
                                        ease: "easeInOut",
                                    }}
                                    className="w-2 h-2 rounded-full bg-blue-600"
                                />
                            ))}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
