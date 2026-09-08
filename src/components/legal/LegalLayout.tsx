import { ReactNode, useEffect } from "react";
import Footer from "../landing/Footer";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
    children: ReactNode;
    title: string;
    lastUpdated?: string;
}

const LegalLayout = ({ children, title, lastUpdated }: LegalLayoutProps) => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/10 p-1.5">
                            <img src="/favicon.svg" alt="Practice Koro Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight hidden sm:block">
                            Practice Koro
                        </h1>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="text-slate-600 hover:text-emerald-600 font-medium rounded-xl"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-white border-b border-slate-200 py-12 md:py-16">
                <div className="container mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tight">
                            {title}
                        </h1>
                        {lastUpdated && (
                            <p className="text-slate-500 font-medium">
                                Last Updated: <span className="text-emerald-600">{lastUpdated}</span>
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-grow container mx-auto px-4 py-12 md:py-16 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 prose prose-slate prose-emerald max-w-none"
                >
                    {children}
                </motion.div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default LegalLayout;
