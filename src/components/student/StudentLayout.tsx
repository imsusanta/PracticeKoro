import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { studentNav } from "@/config/studentNav";
import { Home, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
interface StudentLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  hideNavbar?: boolean;
}

// Sidebar Toggle Button Component - Same position as Admin Panel
const SidebarToggleButton = () => {
  const {
    state,
    toggleSidebar
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  return <button type="button" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar} className={`hidden md:flex fixed z-[100] rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 items-center justify-center hover:from-indigo-600 hover:to-violet-700 hover:shadow-xl hover:scale-110 transition-all duration-150 border-2 border-white w-8 h-8 ${isCollapsed ? "left-[4rem] top-5" : "left-[15.5rem] top-5"}`} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
    {isCollapsed ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />}
  </button>;
};

// Mobile-optimized page transition config (simpler = faster)
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

// Icon color schemes for nav items
const iconColors = [{
  bg: "from-indigo-100 to-violet-100",
  icon: "text-indigo-600",
  activeBg: "from-indigo-500 to-violet-500",
  glow: "shadow-indigo-500/30"
}, {
  bg: "from-emerald-100 to-teal-100",
  icon: "text-emerald-600",
  activeBg: "from-emerald-500 to-teal-500",
  glow: "shadow-emerald-500/30"
}, {
  bg: "from-blue-100 to-cyan-100",
  icon: "text-blue-600",
  activeBg: "from-blue-500 to-cyan-500",
  glow: "shadow-blue-500/30"
}, {
  bg: "from-purple-100 to-pink-100",
  icon: "text-purple-600",
  activeBg: "from-purple-500 to-pink-500",
  glow: "shadow-purple-500/30"
}, {
  bg: "from-orange-100 to-amber-100",
  icon: "text-orange-600",
  activeBg: "from-orange-500 to-amber-500",
  glow: "shadow-orange-500/30"
}];
const StudentLayout = ({
  title,
  subtitle,
  children,
  headerActions,
  hideNavbar = false
}: StudentLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);

  const checkSubscription = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const { data } = await (supabase
      .from("purchases" as any)
      .select("id")
      .eq("user_id", session.user.id)
      .eq("content_type", "subscription")
      .eq("status", "completed")
      .gt("created_at", oneYearAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any);

    setHasSubscription(!!data);
  }, [supabase]);

  useEffect(() => {
    checkSubscription();
  }, [location.pathname, checkSubscription]);

  useEffect(() => {
    document.title = `${title} · Practice Koro`;
  }, [title]);

  const goToHome = () => {
    navigate("/");
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 relative flex overflow-x-hidden" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
    {/* Clean Background - No blur orbs */}

    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SidebarToggleButton />

      {/* Desktop Sidebar - Fixed */}
      <Sidebar side="left" variant="sidebar" collapsible="icon" className="hidden md:flex bg-white/80 backdrop-blur-sm border-r border-slate-100/80 transition-all duration-200 shadow-xl" style={{
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)'
      }}>
        <SidebarHeader className="border-b border-slate-100/60 bg-gradient-to-r from-white/90 to-indigo-50/30">
          <div className="flex items-center gap-3 px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
            <motion.div whileHover={{
              scale: 1.05,
              rotate: 3
            }} whileTap={{
              scale: 0.95
            }} className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0" style={{
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
            }}>
              <Zap className="w-5 h-5 text-white" />
            </motion.div>
            <div className="group-data-[collapsible=icon]:hidden overflow-hidden flex flex-col">
              <h1 className="text-base font-bold text-slate-900 whitespace-nowrap tracking-tight">Student Panel</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Practice Koro</p>
                {hasSubscription && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-[8px] font-black text-white shadow-sm shadow-amber-500/20"
                  >
                    <Zap className="w-2 h-2 fill-current" />
                    PREMIUM
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="py-4 px-2 flex flex-col h-full group-data-[collapsible=icon]:px-1.5">
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3 group-data-[collapsible=icon]:hidden">Menu</p>
            <SidebarMenu className="space-y-1.5 group-data-[collapsible=icon]:space-y-2">
              {studentNav.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const colorSet = iconColors[index % iconColors.length];
                return <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive} className={`rounded-2xl transition-all duration-150 group/item h-auto py-2.5 px-3 ${isActive ? `bg-gradient-to-r ${colorSet.activeBg} text-white shadow-lg ${colorSet.glow}` : "text-slate-600 hover:bg-slate-50"} group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:justify-center ${isActive ? 'group-data-[collapsible=icon]:bg-gradient-to-br group-data-[collapsible=icon]:shadow-md' : 'group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:hover:bg-slate-100'}`}>
                    <Link to={item.path} title={item.name} aria-label={item.name} aria-current={isActive ? "page" : undefined} className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                      {/* Round icon container */}
                      <motion.div
                        whileTap={{ scale: 0.9, backgroundColor: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(99, 102, 241, 0.15)' }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 ${isActive ? 'bg-white/25' : `bg-gradient-to-br ${colorSet.bg}`}`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? "text-white" : colorSet.icon}`} />
                      </motion.div>
                      <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden whitespace-nowrap">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>;
              })}
            </SidebarMenu>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100/60 space-y-1.5 group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:pt-2">
            <SidebarMenuButton asChild className="w-full rounded-2xl text-slate-600 hover:bg-blue-50 transition-all duration-150 group/btn h-auto py-2.5 px-3 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:hover:bg-blue-50">
              <button type="button" onClick={goToHome} title="Home" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                <motion.div
                  whileTap={{ scale: 0.9, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shrink-0"
                >
                  <Home className="w-5 h-5 text-blue-500" />
                </motion.div>
                <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">Home</span>
              </button>
            </SidebarMenuButton>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-transparent flex-1">
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col px-0 pt-1 pb-32 sm:px-3 sm:pt-2 md:items-center md:p-6 md:pb-6 relative z-10 w-full overflow-x-hidden"
          >
            <div className="w-full max-w-7xl mx-auto">
              <h1 className="sr-only">{title}{subtitle ? ` — ${subtitle}` : ""}</h1>
              <div className="hidden md:flex justify-end items-center gap-2 mb-2">
                {headerActions}
                <NotificationBell />
              </div>
              {children}
            </div>
          </motion.main>
        </AnimatePresence>
      </SidebarInset>
    </SidebarProvider>

    {/* ═══════════════════════════════════════════════════════════════
                        MOBILE BOTTOM NAVIGATION - Premium Round Icons
                        ═══════════════════════════════════════════════════════════════ */}
    <div className="md:hidden fixed top-3 right-3 z-[90] pointer-events-auto">
      <NotificationBell />
    </div>

    {!hideNavbar && (
      <nav
        aria-label="Student navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pointer-events-none w-full"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
          paddingLeft: 'max(env(safe-area-inset-left), 8px)',
          paddingRight: 'max(env(safe-area-inset-right), 8px)'
        }}
      >
        <div className="bottom-nav-container pointer-events-auto w-full max-w-lg mx-auto bg-white/95 backdrop-blur-sm border border-white/60 shadow-[0_-2px_20px_rgba(0,0,0,0.06),0_-8px_40px_rgba(0,0,0,0.04)] rounded-[20px] overflow-visible">
          <div className="flex items-center justify-around py-1.5 px-1">
            {studentNav.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const colorSet = iconColors[index % iconColors.length];
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex flex-col items-center justify-center flex-1 py-1 tap-highlight overflow-visible"
                >
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    className="flex flex-col items-center justify-center overflow-visible"
                  >
                    {/* Round colored icon container */}
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 ${isActive
                        ? `bg-gradient-to-br ${colorSet.activeBg}`
                        : 'bg-slate-100'
                        }`}
                      style={isActive ? {
                        boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
                        transform: 'translateY(-2px)'
                      } : {}}
                    >
                      <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? "text-white" : "text-slate-500"}`} />
                    </div>
                    {/* Label */}
                    <span className={`text-[10px] font-semibold mt-1.5 transition-colors duration-200 ${isActive ? colorSet.icon : "text-slate-400"}`}>
                      {item.name}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    )}
  </div>;
};
export default StudentLayout;