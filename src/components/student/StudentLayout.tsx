import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/contexts/StudentContext";
import { checkIsAdmin } from "@/utils/adminAuth";
import { studentNav } from "@/config/studentNav";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardList,
  UserRound,
  NotebookPen,
  BarChart3,
  RotateCcw,
  Trophy,
  Bookmark,
  User,
  Crown,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Target,
  Gauge
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  useSidebar
} from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { initRazorpayPayment } from "@/utils/payment";
import { toast } from "sonner";

interface StudentLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
  hideNavbar?: boolean;
}

// Integrated, sleek Sidebar Toggle Button positioned on the sidebar border
const SidebarToggleButton = () => {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  return (
    <button
      onClick={toggleSidebar}
      className={`hidden md:flex fixed z-[60] rounded-full bg-white text-slate-500 hover:text-blue-600 shadow-sm border border-slate-200 hover:border-blue-300 items-center justify-center transition-all duration-150 w-6 h-6 ${
        isCollapsed ? "left-[3.75rem] top-4.5" : "left-[15.25rem] top-4.5"
      }`}
      title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
    >
      {isCollapsed ? (
        <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
      ) : (
        <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
      )}
    </button>
  );
};

// Page transition config
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Structured navigation categories matching user preferences (No test count mentioned)
const navGroups = [
  {
    category: "Main Menu",
    items: [
      { name: "Home", path: "/student/dashboard", icon: Home },
      { name: "Test Series", path: "/student/test-series", icon: ClipboardList },
      { name: "Practice", path: "/student/practice", icon: Target },
      { name: "Test Results", path: "/student/results", icon: BarChart3 },
      { name: "My Profile", path: "/student/profile", icon: UserRound },
    ],
  },
  {
    category: "Practice & Revision",
    items: [
      { name: "My Readiness", path: "/student/performance", icon: Gauge },
      { name: "Mistakes", path: "/student/mistakes", icon: RotateCcw },
      { name: "Rank", path: "/student/leaderboard", icon: Trophy },
      { name: "Save Questions", path: "/student/bookmarks", icon: Bookmark },
      { name: "Study Notes", path: "/student/notes", icon: BookOpen },
    ],
  },
  {
    category: "Portal",
    items: [
      { name: "Public Home", path: "/", icon: ExternalLink },
    ],
  },
];

const StudentLayout = ({
  title,
  subtitle,
  children,
  headerActions,
  hideNavbar = false,
}: StudentLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { profile: userProfile, hasSubscription, subscriptionFee, refreshSubscription } = useStudentAuth();

  useEffect(() => {
    checkIsAdmin().then(setIsAdminUser);
  }, []);

  const handleProUpgrade = async () => {
    if (hasSubscription) {
      toast.success("Pro Plan is already active!");
      return;
    }
    try {
      await initRazorpayPayment({
        amount: subscriptionFee || 199,
        contentId: "site_yearly_subscription",
        contentType: "subscription",
        title: "PracticeKoro Pro Pass",
        description: "Unlock all mock tests and study notes for 1 year"
      });
      await refreshSubscription();
      toast.success("Pro Access Activated!");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Opening Pro upgrade...";
      if (errorMsg !== "Payment cancelled") {
        toast.info(errorMsg);
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] relative flex overflow-x-hidden"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SidebarToggleButton />

        {/* ═══════════════════════════════════════════════════════════════
            PREMIUM DESKTOP SIDEBAR
            ═══════════════════════════════════════════════════════════════ */}
        <Sidebar
          side="left"
          variant="sidebar"
          collapsible="icon"
          className="hidden md:flex bg-white border-r border-slate-200/80 transition-all duration-200 shadow-[2px_0_12px_rgba(0,0,0,0.02)] z-40"
        >
          {/* Brand Header */}
          <SidebarHeader className="border-b border-slate-100/90 px-3.5 py-4 bg-white">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/80 bg-white"
              >
                <img src="/logo-circle.png" alt="PracticeKoro" className="w-full h-full object-cover" />
              </motion.div>

              <div className="group-data-[collapsible=icon]:hidden overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-base font-extrabold tracking-tight text-slate-900">Practice</span>
                    <span className="text-base font-extrabold tracking-tight text-[#0066FF]">Koro</span>
                  </div>
                  {hasSubscription && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                      <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  WB Exam Preparation
                </p>
              </div>
            </div>
          </SidebarHeader>

          {/* Sidebar Navigation Content */}
          <SidebarContent className="py-3 px-2 flex flex-col gap-3 group-data-[collapsible=icon]:px-1.5">
            {/* Pro Upgrade Mini-Banner for Free Users (Shown ONLY on Home & Settings) */}
            {!hasSubscription && (location.pathname === "/student/dashboard" || location.pathname === "/student/profile") && (
              <div className="mx-1.5 p-3 rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-transparent border border-amber-200/70 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                    <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">PracticeKoro Pro</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug font-medium mt-1">
                  Unlock all mock tests, solutions & study notes
                </p>
                <button
                  onClick={handleProUpgrade}
                  className="mt-2.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs shadow-amber-500/20 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-white/80" /> Upgrade to Pro
                </button>
              </div>
            )}

            {/* Categorized Menu Groups */}
            {navGroups.map((group) => (
              <SidebarGroup key={group.category} className="p-0">
                <SidebarGroupLabel className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1 mb-1 group-data-[collapsible=icon]:hidden">
                  {group.category}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        (item.path === "/student/test-series" &&
                          location.pathname.startsWith("/student/test-series/"));

                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={`rounded-xl transition-all duration-150 h-auto py-2.5 px-3 text-xs sm:text-sm font-semibold group/item ${
                              isActive
                                ? "bg-[#0066FF]/10 text-[#0066FF] font-bold border border-[#0066FF]/20 shadow-2xs hover:bg-[#0066FF]/15"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                            } group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center`}
                          >
                            <Link
                              to={item.path}
                              title={item.name}
                              className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center"
                            >
                              <div className="flex items-center gap-3">
                                <Icon
                                  className={`w-4 h-4 shrink-0 transition-colors ${
                                    isActive
                                      ? "text-[#0066FF] stroke-[2.3]"
                                      : "text-slate-400 group-hover/item:text-slate-700 stroke-[1.8]"
                                  }`}
                                />
                                <span className="group-data-[collapsible=icon]:hidden truncate">
                                  {item.name}
                                </span>
                              </div>

                              {/* Active Indicator Dot */}
                              <div className="group-data-[collapsible=icon]:hidden flex items-center">
                                {isActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0" />
                                )}
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* Student Profile Footer Card */}
          <SidebarFooter className="border-t border-slate-100/90 p-2.5 bg-slate-50/60 space-y-2">
            {isAdminUser && (
              <div className="px-1 group-data-[collapsible=icon]:hidden">
                <Link
                  to="/admin/dashboard"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2.5 p-1 rounded-xl group-data-[collapsible=icon]:justify-center">
              <div className="w-8 h-8 rounded-xl bg-white text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 overflow-hidden border border-slate-200">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <img src="/logo-icon.png" alt="Profile" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {userProfile?.full_name || "Student Aspirant"}
                  </p>
                  {hasSubscription && (
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {hasSubscription ? "Pro Member" : "Free Aspirant"}
                </p>
              </div>
              <Link
                to="/student/profile"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors group-data-[collapsible=icon]:hidden"
                title="Go to Profile"
              >
                <User className="w-4 h-4" />
              </Link>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Inset */}
        <SidebarInset className="bg-[#F8FAFC] flex-1 min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col px-0 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+76px)] sm:px-3 sm:pt-2 md:items-center md:p-6 md:pb-6 relative z-10 w-full overflow-x-hidden"
            >
              <div className="w-full max-w-7xl mx-auto">{children}</div>
            </motion.main>
          </AnimatePresence>
        </SidebarInset>
      </SidebarProvider>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION - Balanced 5-Item Touch Bar
          Home | Exams | Practice | Results | Profile
          ═══════════════════════════════════════════════════════════════ */}
      {!hideNavbar && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-[100] w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(15,23,42,0.08)]"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
            paddingTop: "6px",
          }}
        >
          <div className="w-full max-w-md mx-auto px-1.5">
            <div className="flex items-center justify-around">
              {studentNav.map((item) => {
                const Icon = item.icon;
                const isActive = (
                  (item.path === "/student/dashboard" && (location.pathname === "/student/dashboard" || location.pathname === "/student")) ||
                  (item.path === "/student/test-series" && (
                    location.pathname === "/student/test-series" ||
                    location.pathname.startsWith("/student/test-series/") ||
                    location.pathname === "/student/exam" ||
                    location.pathname === "/student/exams" ||
                    location.pathname === "/student/mocktest" ||
                    location.pathname.startsWith("/student/take-test") ||
                    location.pathname.startsWith("/student/test-review")
                  )) ||
                  (item.path === "/student/practice" && (
                    location.pathname === "/student/practice" ||
                    location.pathname.startsWith("/student/practice/") ||
                    location.pathname === "/student/daily" ||
                    location.pathname === "/student/mistakes" ||
                    location.pathname === "/student/bookmarks" ||
                    location.pathname === "/student/pyq"
                  )) ||
                  (item.path === "/student/results" && (
                    location.pathname === "/student/results" ||
                    location.pathname.startsWith("/student/test-review")
                  )) ||
                  (item.path === "/student/notes" && (
                    location.pathname === "/student/notes" ||
                    location.pathname === "/student/current-affairs"
                  )) ||
                  (item.path === "/student/profile" && location.pathname === "/student/profile")
                );

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative flex flex-col items-center justify-center flex-1 py-0.5 tap-highlight select-none min-h-[48px]"
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                        isActive
                          ? "bg-[#0066FF]/10 text-[#0066FF]"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-all duration-200 ${
                          isActive
                            ? "text-[#0066FF] stroke-[2.5] scale-110"
                            : "text-slate-400 stroke-[1.8]"
                        }`}
                      />
                      <span
                        className={`text-[10px] mt-0.5 tracking-tight transition-colors duration-150 ${
                          isActive
                            ? "font-extrabold text-[#0066FF]"
                            : "font-semibold text-slate-500"
                        }`}
                      >
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
    </div>
  );
};

export default StudentLayout;
