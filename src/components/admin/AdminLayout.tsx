import { ReactNode, useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { navSections, managementTools } from "@/config/adminNav";
import { LogOut, Home, Shield, Menu, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
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
            onClick={toggleSidebar}
            className={`hidden md:flex fixed z-[100] rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shadow-blue-600/30 items-center justify-center hover:from-blue-700 hover:to-indigo-800 hover:scale-105 transition-all duration-150 border-2 border-white w-8 h-8 ${isCollapsed
                ? "left-[4.2rem] top-5"
                : "left-[16.2rem] top-5"
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
    duration: 0.2,
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

    const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarState);
    const sidebarContentRef = useRef<HTMLDivElement>(null);

    const saveScrollPosition = () => {
        const sidebar = sidebarContentRef.current;
        if (sidebar) {
            sidebarScrollPosition = sidebar.scrollTop;
        }
    };

    useEffect(() => {
        const sidebar = sidebarContentRef.current;
        if (!sidebar) return;

        const handleScroll = () => {
            sidebarScrollPosition = sidebar.scrollTop;
        };

        sidebar.addEventListener("scroll", handleScroll, { passive: true });
        return () => sidebar.removeEventListener("scroll", handleScroll);
    }, [sidebarContentRef]);

    useLayoutEffect(() => {
        const sidebar = sidebarContentRef.current;
        if (!sidebar) return;

        if (sidebarScrollPosition > 0) {
            sidebar.scrollTop = sidebarScrollPosition;
        }

        const activeItem = sidebar.querySelector('[data-active-menu="true"]');
        if (activeItem) {
            const timer = setTimeout(() => {
                const rect = (activeItem as HTMLElement).getBoundingClientRect();
                const containerRect = sidebar.getBoundingClientRect();

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
        document.cookie = 'sidebar:state=true; path=/; max-age=0';
        localStorage.clear();
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 relative flex overflow-x-hidden">
            <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SidebarToggleButton />

                {/* Enhanced Sidebar - Practice Koro Executive Navy Theme */}
                <Sidebar
                    side="left"
                    variant="sidebar"
                    collapsible="icon"
                    className="bg-white border-r border-slate-200/90 shadow-xs transition-all duration-200"
                >
                    <SidebarHeader className="border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3 px-3 py-3.5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shadow-2xs shrink-0 border border-slate-200/80 p-1"
                            >
                                <img src="/logo-circle.png" alt="Practice Koro" className="w-full h-full object-contain rounded-xl" />
                            </motion.div>
                            <div className="group-data-[collapsible=icon]:hidden overflow-hidden min-w-0">
                                <h1 className="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">Practice Koro</h1>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                                        ADMIN PANEL
                                    </span>
                                </div>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent ref={sidebarContentRef} className="py-3 px-2 flex flex-col h-full group-data-[collapsible=icon]:px-2 overflow-y-auto scroll-smooth space-y-4">
                        {/* Grouped Navigation Sections */}
                        <div className="flex-1 space-y-4">
                            {navSections.map((section) => (
                                <div key={section.title} className="space-y-1">
                                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-1 group-data-[collapsible=icon]:hidden">
                                        {section.title}
                                    </p>
                                    <SidebarMenu className="space-y-1">
                                        {section.items.map((tool) => {
                                            const Icon = tool.icon;
                                            const isActive = location.pathname === tool.path;

                                            return (
                                                <SidebarMenuItem key={tool.path} data-active-menu={isActive}>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={isActive}
                                                        className={`rounded-xl transition-all duration-150 h-auto ${isActive
                                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold"
                                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-medium"
                                                            } group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2`}
                                                    >
                                                        <Link
                                                            to={tool.path}
                                                            title={tool.name}
                                                            onClick={saveScrollPosition}
                                                            className="flex items-center gap-2.5 px-3 py-2.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                                        >
                                                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-slate-500"}`} />
                                                            <span className="text-xs group-data-[collapsible=icon]:hidden whitespace-nowrap">
                                                                {tool.name}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-auto pt-3 border-t border-slate-100 space-y-1">
                            {/* Preview Student Portal */}
                            <SidebarMenuButton
                                asChild
                                className="w-full rounded-xl text-blue-700 bg-blue-50/70 hover:bg-blue-100/80 hover:text-blue-800 transition-all font-bold group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 h-auto"
                            >
                                <button
                                    onClick={() => navigate("/student/dashboard")}
                                    title="View Student Portal"
                                    className="flex items-center gap-2.5 px-3 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                >
                                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span className="text-xs group-data-[collapsible=icon]:hidden">Student Portal</span>
                                </button>
                            </SidebarMenuButton>

                            {/* Home Button */}
                            <SidebarMenuButton
                                asChild
                                className="w-full rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 h-auto"
                            >
                                <button
                                    onClick={() => navigate("/")}
                                    title="Landing Page"
                                    className="flex items-center gap-2.5 px-3 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                >
                                    <Home className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium group-data-[collapsible=icon]:hidden">Landing Page</span>
                                </button>
                            </SidebarMenuButton>

                            {/* Logout Button */}
                            <SidebarMenuButton
                                asChild
                                className="w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 h-auto"
                            >
                                <button
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="flex items-center gap-2.5 px-3 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                >
                                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span className="text-xs font-semibold group-data-[collapsible=icon]:hidden">Logout</span>
                                </button>
                            </SidebarMenuButton>
                        </div>
                    </SidebarContent>
                </Sidebar>

                <SidebarInset className="bg-transparent flex-1">
                    {/* Modern Executive Floating Header */}
                    <header className="sticky top-0 z-20 safe-area-top">
                        <div className="mx-3 sm:mx-4 md:mx-6 mt-3 sm:mt-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
                            <div className="flex items-center h-14 sm:h-16 px-4 md:px-5 gap-3">
                                {/* Mobile Menu Trigger */}
                                <SidebarTrigger className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
                                    <Menu className="w-4 h-4" />
                                </SidebarTrigger>

                                {/* Title Section */}
                                <div className="flex-1 min-w-0">
                                    <motion.h1
                                        key={title}
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate"
                                    >
                                        {title}
                                    </motion.h1>
                                    {subtitle && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.05 }}
                                            className="text-xs text-slate-500 font-medium truncate"
                                        >
                                            {subtitle}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Right Header Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => navigate("/student/dashboard")}
                                        className="hidden sm:inline-flex items-center gap-1.5 h-8 text-xs font-bold text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 rounded-xl"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Student View</span>
                                    </Button>

                                    <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                            A
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-900 leading-tight">Admin</p>
                                            <p className="text-[10px] text-slate-400 font-semibold">Master Admin</p>
                                        </div>
                                    </div>

                                    {headerActions}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Animated Content */}
                    <AnimatePresence mode="wait">
                        <motion.main
                            key={location.pathname}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={pageTransition}
                            className="flex-1 p-3 sm:p-4 md:p-6 pb-28 md:pb-8 relative z-10 w-full max-w-7xl mx-auto"
                        >
                            <div className="w-full">
                                {children}
                            </div>
                        </motion.main>
                    </AnimatePresence>

                    {/* Mobile Bottom Bar */}
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe-area-bottom pointer-events-none">
                        <div className="mx-auto mb-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl pointer-events-auto max-w-md">
                            <div className="flex items-center justify-around h-14 p-1.5">
                                {managementTools.slice(0, 4).map((tool) => {
                                    const Icon = tool.icon;
                                    const isActive = location.pathname === tool.path;
                                    return (
                                        <Link
                                            key={tool.path}
                                            to={tool.path}
                                            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${isActive
                                                ? "text-blue-600 bg-blue-50 font-bold"
                                                : "text-slate-500 hover:text-slate-900"
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-[8px] font-bold mt-1 truncate max-w-full px-0.5">
                                                {tool.name.split(" ")[0]}
                                            </span>
                                        </Link>
                                    );
                                })}

                                {managementTools.length > 4 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${managementTools.slice(4).some(t => location.pathname === t.path)
                                                    ? "text-blue-600 bg-blue-50 font-bold"
                                                    : "text-slate-500 hover:text-slate-900"
                                                    }`}
                                            >
                                                <Menu className="w-4 h-4" />
                                                <span className="text-[8px] font-bold mt-1">More</span>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="mb-3 w-56 p-2 rounded-2xl bg-white border border-slate-200 shadow-2xl z-[100] max-h-80 overflow-y-auto">
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {managementTools.slice(4).map((tool) => {
                                                    const Icon = tool.icon;
                                                    const isActive = location.pathname === tool.path;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={tool.path}
                                                            asChild
                                                            className="p-0 bg-transparent focus:bg-transparent"
                                                        >
                                                            <Link
                                                                to={tool.path}
                                                                className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all border ${isActive
                                                                    ? "text-blue-700 bg-blue-50 border-blue-200 font-bold"
                                                                    : "text-slate-600 hover:bg-slate-50 border-transparent font-medium"
                                                                    }`}
                                                            >
                                                                <Icon className="w-4 h-4 mb-1" />
                                                                <span className="text-[9px] text-center leading-tight">{tool.name}</span>
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
            </SidebarProvider>
        </div>
    );
};

export default AdminLayout;

