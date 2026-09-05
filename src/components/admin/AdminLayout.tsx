import { ReactNode, useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { managementTools } from "@/config/adminNav";
import { LogOut, Home, Shield, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

interface AdminLayoutProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    headerActions?: ReactNode;
}

// Sidebar Toggle Button Component - rendered outside sidebar to always be accessible
const SidebarToggleButton = () => {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden md:flex fixed z-[100] rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 items-center justify-center hover:from-indigo-600 hover:to-violet-700 hover:shadow-xl hover:scale-110 transition-all duration-150 border-2 border-white w-8 h-8 ${isCollapsed
                ? "left-[4rem] top-5"
                : "left-[15.5rem] top-5"
                }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-white" />
            ) : (
                <ChevronLeft className="w-4 h-4 text-white" />
            )}
        </button>
    );
};

// Page transition config
const pageTransition = {
    duration: 0.25,
    ease: "easeInOut",
} as const;

// Read initial sidebar state from cookie
const getInitialSidebarState = (): boolean => {
    if (typeof document === 'undefined') return true;
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('sidebar:state='));
    if (cookie) {
        return cookie.split('=')[1] === 'true';
    }
    return true; // Default open
};

// Store sidebar scroll position globally to persist across route changes
let sidebarScrollPosition = 0;

const AdminLayout = ({ title, subtitle, children, headerActions }: AdminLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        document.title = `${title} · Practice Koro Admin`;
    }, [title]);

    // Controlled sidebar state - persists across navigation
    const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarState);
    const sidebarContentRef = useRef<HTMLDivElement>(null);

    // Helper to save scroll position - called before navigation
    const saveScrollPosition = () => {
        const sidebar = sidebarContentRef.current;
        if (sidebar) {
            sidebarScrollPosition = sidebar.scrollTop;
        }
    };

    // Save scroll position continuously on scroll
    useEffect(() => {
        const sidebar = sidebarContentRef.current;
        if (!sidebar) return;

        const handleScroll = () => {
            sidebarScrollPosition = sidebar.scrollTop;
        };

        sidebar.addEventListener("scroll", handleScroll, { passive: true });
        return () => sidebar.removeEventListener("scroll", handleScroll);
    }, [sidebarContentRef]);

    // Unified Sidebar Scroll Management
    useLayoutEffect(() => {
        const sidebar = sidebarContentRef.current;
        if (!sidebar) return;

        // 1. Restore previous scroll position immediately (sync)
        if (sidebarScrollPosition > 0) {
            sidebar.scrollTop = sidebarScrollPosition;
        }

        // 2. Ensure active menu item is visible (with a small delay for page settling)
        const activeItem = sidebar.querySelector('[data-active-menu="true"]');
        if (activeItem) {
            const timer = setTimeout(() => {
                const rect = (activeItem as HTMLElement).getBoundingClientRect();
                const containerRect = sidebar.getBoundingClientRect();

                // Only scroll into view if it's NOT already in the viewport
                if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                    (activeItem as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
        // Clear sidebar state cookie so next login starts fresh
        document.cookie = 'sidebar:state=true; path=/; max-age=0';
        ["sidebar:state", "practicekoro_remember_email", "practicekoro_admin_remember_email"].forEach((key) => {
            localStorage.removeItem(key);
        });
        navigate("/");
    };

    // Color variations for icons
    const iconColors = [
        { bg: "from-emerald-100 to-teal-100", icon: "text-emerald-600", activeBg: "from-emerald-500 to-teal-500" },
        { bg: "from-blue-100 to-cyan-100", icon: "text-blue-600", activeBg: "from-blue-500 to-cyan-500" },
        { bg: "from-purple-100 to-pink-100", icon: "text-purple-600", activeBg: "from-purple-500 to-pink-500" },
        { bg: "from-orange-100 to-amber-100", icon: "text-orange-600", activeBg: "from-orange-500 to-amber-500" },
        { bg: "from-rose-100 to-red-100", icon: "text-rose-600", activeBg: "from-rose-500 to-red-500" },
        { bg: "from-indigo-100 to-violet-100", icon: "text-indigo-600", activeBg: "from-indigo-500 to-violet-500" },
        { bg: "from-teal-100 to-cyan-100", icon: "text-teal-600", activeBg: "from-teal-500 to-cyan-500" },
        { bg: "from-fuchsia-100 to-pink-100", icon: "text-fuchsia-600", activeBg: "from-fuchsia-500 to-pink-500" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 relative flex overflow-x-hidden">
            <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
                {/* Toggle Button - Fixed position, always accessible */}
                <SidebarToggleButton />

                {/* Enhanced Sidebar - Fixed on Desktop */}
                <Sidebar
                    side="left"
                    variant="sidebar"
                    collapsible="icon"
                    className="bg-white/70 backdrop-blur-sm border-r border-white/50 shadow-xl shadow-emerald-500/10 transition-all duration-200"
                >

                    <SidebarHeader className="border-b border-emerald-100/30 bg-gradient-to-r from-white/80 to-emerald-50/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3 px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 3 }}
                                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0"
                            >
                                <Shield className="w-5 h-5 text-white" />
                            </motion.div>
                            <div className="group-data-[collapsible=icon]:hidden overflow-hidden">
                                <h1 className="text-base font-bold text-gray-900 whitespace-nowrap">Admin Panel</h1>
                                <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Practice Koro</p>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent ref={sidebarContentRef} className="py-4 px-2 flex flex-col h-full group-data-[collapsible=icon]:px-2 overflow-y-auto scroll-smooth">
                        {/* Navigation Menu */}
                        <div className="flex-1">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3 group-data-[collapsible=icon]:hidden">Management</p>
                            <SidebarMenu className="space-y-1.5">
                                {managementTools.map((tool, index) => {
                                    const Icon = tool.icon;
                                    const isActive = location.pathname === tool.path;
                                    const colorSet = iconColors[index % iconColors.length];

                                    return (
                                        <SidebarMenuItem key={tool.path} data-active-menu={isActive}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                className={`rounded-xl transition-all duration-300 ease-out group/item h-auto ${isActive
                                                    ? `bg-gradient-to-r ${colorSet.activeBg} text-white shadow-lg shadow-emerald-500/20 scale-[1.02]`
                                                    : "text-gray-600 hover:bg-gradient-to-r hover:from-white/90 hover:to-gray-50/80 hover:shadow-md hover:scale-[1.02] hover:translate-x-1"
                                                    } group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2`}
                                            >
                                                <Link
                                                    to={tool.path}
                                                    title={tool.name}
                                                    onClick={saveScrollPosition}
                                                    className="flex items-center gap-3 px-3 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                                >
                                                    <motion.div
                                                        whileHover={{ scale: 1.15, rotate: 5 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${isActive
                                                            ? "bg-white/30 shadow-inner backdrop-blur-sm"
                                                            : `bg-gradient-to-br ${colorSet.bg} shadow-sm group-hover/item:shadow-md group-hover/item:scale-105`
                                                            }`}
                                                    >
                                                        <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? "text-white drop-shadow-sm" : `${colorSet.icon} group-hover/item:scale-110`}`} />
                                                    </motion.div>
                                                    <span className={`font-semibold text-sm group-data-[collapsible=icon]:hidden whitespace-nowrap transition-all duration-300 ${isActive ? "tracking-wide" : "group-hover/item:text-gray-800 group-hover/item:tracking-wide"}`}>{tool.name}</span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="activeIndicator"
                                                            className="absolute right-2 w-1.5 h-8 bg-white/40 rounded-full group-data-[collapsible=icon]:hidden"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ duration: 0.2 }}
                                                        />
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-auto pt-4 border-t border-gray-100/50 space-y-1">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 group-data-[collapsible=icon]:hidden">Actions</p>

                            {/* Home Button */}
                            <SidebarMenuButton
                                asChild
                                className="w-full rounded-xl text-gray-600 hover:bg-emerald-50/80 hover:text-emerald-700 transition-all duration-150 group/btn group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 h-auto"
                            >
                                <button
                                    type="button"
                                    onClick={() => navigate("/")}
                                    title="Go to Home"
                                    className="flex items-center gap-3 px-3 py-2.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shadow-sm shrink-0"
                                    >
                                        <Home className="w-4 h-4 text-emerald-600" />
                                    </motion.div>
                                    <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">Go to Home</span>
                                </button>
                            </SidebarMenuButton>

                            {/* Logout Button */}
                            <SidebarMenuButton
                                asChild
                                className="w-full rounded-xl text-gray-600 hover:bg-red-50/80 hover:text-red-600 transition-all duration-150 group/btn group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 h-auto"
                            >
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="flex items-center gap-3 px-3 py-2.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center shadow-sm shrink-0"
                                    >
                                        <LogOut className="w-4 h-4 text-red-500" />
                                    </motion.div>
                                    <span className="font-medium text-sm group-data-[collapsible=icon]:hidden">Logout</span>
                                </button>
                            </SidebarMenuButton>
                        </div>
                    </SidebarContent>
                </Sidebar>

                <SidebarInset className="bg-transparent flex-1">
                    {/* Transparent Floating Header */}
                    <header className="sticky top-0 z-20 safe-area-top">
                        <div className="mx-4 md:mx-6 mt-4 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/50 shadow-lg shadow-gray-200/20">
                            <div className="flex items-center h-14 md:h-16 px-4 md:px-5 gap-3">
                                {/* Mobile Menu Trigger */}
                                <SidebarTrigger className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/60 text-emerald-700 hover:bg-white transition-all duration-150">
                                    <Menu className="w-5 h-5" />
                                </SidebarTrigger>

                                {/* Title Section */}
                                <div className="flex-1 min-w-0">
                                    <motion.h1
                                        key={title}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-lg md:text-xl font-bold text-gray-900 truncate"
                                    >
                                        {title}
                                    </motion.h1>
                                    {subtitle && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-xs text-gray-500 truncate"
                                        >
                                            {subtitle}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Header Actions */}
                                <div className="flex items-center gap-2">
                                    {headerActions}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Animated Content */}
                    <AnimatePresence mode="wait">
                        <motion.main
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={pageTransition}
                            className="flex-1 p-4 md:p-6 pb-32 md:pb-6 relative z-10 w-full max-w-7xl mx-auto"
                        >
                            <div className="w-full">
                                {children}
                            </div>
                        </motion.main>
                    </AnimatePresence>

                    {/* Enhanced Bottom Navigation (Mobile) */}
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe-area-bottom pointer-events-none">
                        <div className="mx-auto mb-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-white/40 shadow-2xl pointer-events-auto max-w-md">
                            <div className="flex items-center justify-around h-16 p-2">
                                {managementTools.slice(0, 4).map((tool, index) => {
                                    const Icon = tool.icon;
                                    const isActive = location.pathname === tool.path;
                                    const colorSet = iconColors[index % iconColors.length];
                                    return (
                                        <Link
                                            key={tool.path}
                                            to={tool.path}
                                            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-150 ${isActive
                                                ? `text-white bg-gradient-to-br ${colorSet.activeBg} shadow-lg shadow-emerald-500/20 scale-105`
                                                : "text-gray-400 hover:text-emerald-600"
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 relative z-10 transition-transform duration-150 ${isActive ? "scale-110" : ""}`} />
                                            <span className={`relative z-10 text-[8px] font-bold mt-1.5 truncate max-w-full px-1 uppercase tracking-tighter ${isActive ? "text-white" : "text-gray-500"}`}>
                                                {tool.name.split(" ")[0]}
                                            </span>
                                        </Link>
                                    );
                                })}

                                {/* More Menu */}
                                {managementTools.length > 4 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="More admin pages"
                                                className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-150 ${managementTools.slice(4).some(t => location.pathname === t.path)
                                                    ? "text-emerald-600 bg-emerald-50 shadow-sm"
                                                    : "text-gray-400 hover:text-emerald-600"
                                                    }`}
                                            >
                                                <Menu className="w-5 h-5" />
                                                <span className="text-[9px] font-bold mt-1">More</span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="mb-4 w-56 p-2 rounded-2xl bg-white/95 backdrop-blur-sm border-white/50 shadow-2xl z-[100]">
                                            <div className="grid grid-cols-2 gap-2">
                                                {managementTools.slice(4).map((tool, index) => {
                                                    const Icon = tool.icon;
                                                    const isActive = location.pathname === tool.path;
                                                    const colorSet = iconColors[(index + 4) % iconColors.length];
                                                    return (
                                                        <DropdownMenuItem
                                                            key={tool.path}
                                                            asChild
                                                            className="p-0 bg-transparent focus:bg-transparent"
                                                        >
                                                            <Link
                                                                to={tool.path}
                                                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-150 border border-transparent ${isActive
                                                                    ? `text-white bg-gradient-to-br ${colorSet.activeBg} shadow-md`
                                                                    : "text-gray-600 hover:bg-emerald-50/50 hover:border-emerald-100"
                                                                    }`}
                                                            >
                                                                <Icon className={`w-5 h-5 mb-1.5 ${isActive ? "text-white" : colorSet.icon}`} />
                                                                <span className="text-[10px] font-bold text-center leading-tight">{tool.name}</span>
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    </nav>
                </SidebarInset>
            </SidebarProvider >
        </div >
    );
};

export default AdminLayout;
