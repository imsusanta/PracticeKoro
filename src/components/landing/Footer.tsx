import { Send, Phone, Mail, MapPin, Zap, CheckCircle, ArrowUpRight, Heart, Instagram, Youtube, Facebook } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer className="relative overflow-hidden bg-slate-900">
            {/* Top Wave Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

            {/* Main Footer Content */}
            <div className="container mx-auto px-5 pt-16 pb-12 md:pt-20 md:pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">

                    {/* Brand Column */}
                    <div className="sm:col-span-2 lg:col-span-1 space-y-6 flex flex-col items-center sm:items-start text-center sm:text-left">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-700/50 p-2"
                                style={{ filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.15))' }}
                            >
                                <img src="/favicon.svg" alt="Practice Koro Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Practice Koro</h3>
                                <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Exam Prep Simplified</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                            Your ultimate platform for exam preparation. Smart mock tests, detailed analytics, and study materials.
                        </p>
                        {/* Social Links */}
                        <div className="flex items-center justify-center sm:justify-start gap-4 pt-2 mb-[3px]">
                            {[
                                { icon: Send, href: "https://t.me/parikshanotespdf", color: "hover:bg-[#0088cc]" },
                                { icon: Instagram, href: "https://www.instagram.com/parikshanotes_in", color: "hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500" },
                                { icon: Youtube, href: "https://www.youtube.com/@parikshanotesofficial", color: "hover:bg-red-600" },
                                { icon: Facebook, href: "https://www.facebook.com/parikshanotes.official", color: "hover:bg-blue-600" }
                            ].map((social, i) => (
                                <a
                                    key={i}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`w-11 h-11 rounded-xl bg-slate-800/80 flex items-center justify-center transition-all duration-300 group ${social.color}`}
                                >
                                    <social.icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="hidden sm:block space-y-6">
                        <h4 className="text-white font-bold text-sm uppercase tracking-[0.2em]">
                            Quick Links
                        </h4>
                        <ul className="space-y-4 text-sm">
                            {[
                                { label: "Register", to: "/register" },
                                { label: "Login", to: "/login" },
                                { label: "Dashboard", to: "/student/dashboard" },
                                { label: "Exams", to: "/student/exam" },
                                { label: "Admin Portal", to: "/admin" },
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        to={link.to}
                                        className="text-slate-400 hover:text-emerald-400 transition-all flex items-center gap-2 group"
                                    >
                                        <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-400" />
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="hidden sm:block space-y-6">
                        <h4 className="text-white font-bold text-sm uppercase tracking-[0.2em]">
                            Contact Us
                        </h4>
                        <ul className="space-y-5 text-sm">
                            {[
                                { icon: Phone, label: "Phone", val: "+91 95477 71118", href: "tel:+919547771118" },
                                { icon: Mail, label: "Email", val: "contact@practicekoro.online", href: "mailto:contact@practicekoro.online" },
                                { icon: MapPin, label: "Location", val: "Sarenga, Bankura, WB", href: "#" }
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-4 group cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:bg-opacity-20 transition-all">
                                        <item.icon className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-0.5">{item.label}</p>
                                        <a href={item.href} className="text-slate-300 font-medium group-hover:text-emerald-400 transition-colors block">
                                            {item.val}
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Telegram CTA */}
                    <div className="sm:col-span-2 lg:col-span-1 flex justify-center sm:justify-start">
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900 rounded-3xl p-6 border border-slate-700/50 relative overflow-hidden group w-full max-w-sm">
                            {/* Animated Background Pulse */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />

                            <div className="flex items-center gap-4 mb-5">
                                <div
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0088cc] to-[#00a8e8] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20"
                                >
                                    <Send className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-white text-base">Join Telegram</h4>
                                    <p className="text-xs text-slate-400">Notes & Daily Updates</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed text-left">
                                Get exclusive access to free study notes and daily quizzes.
                            </p>
                            <a
                                href="https://t.me/parikshanotespdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-2xl text-white font-bold bg-gradient-to-r from-[#0088cc] to-[#00a8e8] hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all active:scale-[0.98]"
                            >
                                <Send className="w-5 h-5" />
                                <span>@parikshanotespdf</span>
                            </a>
                        </div>
                    </div>

                </div>
            </div>

            {/* Copyright Bar */}
            <div className="border-t border-slate-800">
                <div className="container mx-auto px-5 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500 text-center md:text-left flex items-center justify-center md:justify-start gap-1">
                        © 2026 Practice Koro. Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> in India
                    </p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
                        <Link to="/privacy-policy" className="text-slate-500 hover:text-emerald-400 transition-colors">Privacy Policy</Link>
                        <Link to="/terms-of-service" className="text-slate-500 hover:text-emerald-400 transition-colors">Terms of Service</Link>
                        <Link to="/refund-policy" className="text-slate-500 hover:text-emerald-400 transition-colors">Refund Policy</Link>
                        <Link to="/cookie-policy" className="text-slate-500 hover:text-emerald-400 transition-colors">Cookie Policy</Link>
                        <Link to="/admin" className="text-slate-500 hover:text-emerald-400 transition-colors">Admin</Link>
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;
