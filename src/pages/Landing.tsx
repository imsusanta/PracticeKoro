import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  BookOpen, Brain, FileText, TrendingUp, Sparkles, LogOut, User, Users, Clock, Award, PlayCircle, ChevronRight, CheckCircle, UserPlus, Library, LineChart, Target, FileQuestion, Zap, ArrowRight, Trophy, Download, Smartphone, Send, Mail, MapPin, Phone as PhoneIcon, Heart, Shield, Pen, Star
} from "lucide-react";
import HowItWorks from "@/components/landing/HowItWorks";
import LatestBlogs from "@/components/landing/LatestBlogs";
import Footer from "@/components/landing/Footer";
import SplashScreen from "../components/landing/SplashScreen";
// import PWAInstallPrompt removed to avoid conflict with global App.tsx version
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { toast } from "sonner";
import { getVisibleExamIds, getVisibleTestIds } from "@/config/landingVisibility"; // Kept for potential admin toggle feature
import { Capacitor } from "@capacitor/core";


interface Exam {
  id: string;
  name: string;
  description: string | null;
  order_index?: number;
}
interface MockTest {
  id: string;
  title: string;
  description: string | null;
  test_type: "full_mock" | "topic_wise";
  duration_minutes: number;
  total_marks: number;
  exams?: {
    name: string;
  };
  subjects?: {
    name: string;
  };
}

// Demo data for landing page (shown when database is not accessible)
const demoExams: Exam[] = [
  { id: "demo-1", name: "WBCS", description: "West Bengal Civil Service Examination" },
  { id: "demo-2", name: "SSC CGL", description: "Staff Selection Commission Combined Graduate Level" },
  { id: "demo-3", name: "Banking PO", description: "Probationary Officer Examination" },
  { id: "demo-4", name: "Railway RRB", description: "Railway Recruitment Board Exams" },
  { id: "demo-5", name: "UPSC", description: "Union Public Service Commission" },
  { id: "demo-6", name: "State PSC", description: "State Public Service Commission Exams" },
];

const demoTests: MockTest[] = [
  { id: "demo-t1", title: "WBCS Prelims Full Mock Test 1", description: "Complete practice test covering all subjects", test_type: "full_mock", duration_minutes: 120, total_marks: 200, exams: { name: "WBCS" } },
  { id: "demo-t2", title: "General Knowledge Practice", description: "Topic-wise GK questions", test_type: "topic_wise", duration_minutes: 30, total_marks: 50, exams: { name: "WBCS" } },
  { id: "demo-t3", title: "SSC CGL Tier 1 Mock", description: "Full length mock test for SSC CGL", test_type: "full_mock", duration_minutes: 60, total_marks: 200, exams: { name: "SSC CGL" } },
  { id: "demo-t4", title: "Reasoning Ability Test", description: "Practice logical reasoning questions", test_type: "topic_wise", duration_minutes: 45, total_marks: 75, exams: { name: "Banking" } },
  { id: "demo-t5", title: "English Language Practice", description: "Grammar and comprehension test", test_type: "topic_wise", duration_minutes: 30, total_marks: 50, exams: { name: "SSC CGL" } },
  { id: "demo-t6", title: "Quantitative Aptitude Mock", description: "Mathematics practice test", test_type: "topic_wise", duration_minutes: 45, total_marks: 75, exams: { name: "Banking" } },
];

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  if (window.innerWidth < 768) return true;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
};

const Landing = () => {
  const navigate = useNavigate();
  const isMobile = isMobileDevice();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{ first_name?: string; last_name?: string; full_name?: string; avatar_url?: string } | null>(null);
  const [userRole, setUserRole] = useState<"student" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [featuredTests, setFeaturedTests] = useState<MockTest[]>([]);
  const [filterType, setFilterType] = useState<"all" | "full_mock" | "topic_wise">("all");
  const [showSplash, setShowSplash] = useState(false);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        loadExams(),
        loadFeaturedTests()
      ]);
      toast.success("Page refreshed", { icon: <Sparkles className="w-4 h-4 text-emerald-500" /> });
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  const { PullIndicator, containerProps } = usePullToRefresh({
    onRefresh: handleRefresh
  });

  useEffect(() => {
    if (isMobile) {
      // Check if splash was already shown in this session
      const alreadyShown = sessionStorage.getItem("pk_splash_shown") === "true";
      if (alreadyShown) {
        setSplashFinished(true);
      }
      checkAuth();
    } else {
      // On desktop, load everything
      Promise.all([checkAuth(), loadExams(), loadFeaturedTests()]);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && splashFinished && authChecked) {
      if (isLoggedIn) {
        navigate(userRole === "admin" ? "/admin/dashboard" : "/student/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [isMobile, splashFinished, authChecked, isLoggedIn, userRole, navigate]);

  useEffect(() => {
    if (isMobile && splashFinished) {
      // Safety timeout: if auth takes longer than 3 seconds, navigate to login
      const timer = setTimeout(() => {
        if (!authChecked) {
          navigate("/login", { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, splashFinished, authChecked, navigate]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Single query to get role and profile together for faster loading
        const [roleResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["student", "admin"]).maybeSingle(),
          supabase.from("profiles").select("*").eq("id", session.user.id).single()
        ]);

        if (roleResult.data && profileResult.data) {
          setUserProfile({
            full_name: profileResult.data.full_name ?? undefined,
            avatar_url: profileResult.data.avatar_url ?? undefined,
          });
          setUserRole(roleResult.data.role as "student" | "admin");
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };
  const loadExams = async () => {
    try {
      console.log("[Landing] Loading exams from database...");
      // Fetch ALL exams (removed is_active filter to show all database exams)
      const { data, error } = await supabase.from("exams").select("id, name, description").order("created_at", { ascending: true });

      console.log("[Landing] Exams query result:", { data, error, count: data?.length });

      if (error) {
        console.error("[Landing] Exams query error:", error);
        setExams([]);  // Show empty if database error
        return;
      }

      if (data && data.length > 0) {
        console.log("[Landing] Setting actual exams from database:", data.map(e => e.name));
        setExams(data);
      } else {
        console.log("[Landing] No exams in database");
        setExams([]);  // Show empty if no exams in database
      }
    } catch (error) {
      console.error("[Landing] Error loading exams:", error);
      setExams([]);  // Show empty on error
    }
  };
  const loadFeaturedTests = async () => {
    try {
      console.log("[Landing] Loading mock tests from database...");
      // Fetch ALL mock tests (removed is_published filter to show all database tests)
      const { data, error } = await supabase.from("mock_tests").select("id, title, description, test_type, duration_minutes, total_marks, exams(name), subjects(name)").order("created_at", {
        ascending: false
      }).limit(8);

      console.log("[Landing] Mock tests query result:", { data, error, count: data?.length });

      if (error) {
        console.error("[Landing] Mock tests query error:", error);
        setFeaturedTests([]);
        return;
      }

      if (data && data.length > 0) {
        console.log("[Landing] Setting actual tests from database:", data.map(t => t.title));
        setFeaturedTests(data as MockTest[]);
      } else {
        console.log("[Landing] No tests in database");
        setFeaturedTests([]);
      }
    } catch (error) {
      console.error("[Landing] Error loading featured tests:", error);
      setFeaturedTests([]);
    }
  };
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.clear();
    setIsLoggedIn(false);
    setUserProfile(null);
    setUserRole(null);
  };
  const handleStartTest = (testId: string) => {
    if (isLoggedIn) {
      navigate(`/student/take-test/${testId}`);
    } else {
      navigate("/login");
    }
  };
  const filteredTests = filterType === "all" ? featuredTests : featuredTests.filter(test => test.test_type === filterType);

  if (isMobile) {
    return (
      <SplashScreen
        onComplete={() => {
          sessionStorage.setItem("pk_splash_shown", "true");
          setSplashFinished(true);
        }}
      />
    );
  }

  return (
    <>
      {/* Splash Screen for desktop if enabled */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Main Content */}
      <AnimatePresence>
        {!showSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-[#FAFAFA] relative overflow-x-hidden"
            {...containerProps}
          >
            <PullIndicator />
            {/* Desktop Header - Premium Floating Style (Non-Sticky) */}
            <header className="hidden md:block absolute top-0 left-0 right-0 z-50">
              <div className="container mx-auto px-4 py-4">
                <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-gray-200/50" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' }}>
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center group-hover:scale-105 transition-transform p-1.5 shadow-sm border border-gray-100">
                        <img src="/favicon.svg" alt="Practice Koro Logo" className="w-full h-full object-contain" />
                      </div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">Practice Koro</h1>
                    </div>

                  {/* Right Side */}
                  {!loading && <div className="flex items-center gap-3">
                    {isLoggedIn && userProfile ? <>
                      <span className="text-gray-600 font-medium text-sm">
                        Hi, <span className="text-emerald-600">{userProfile.full_name?.split(' ')[0]}</span>
                      </span>
                      <Button variant="outline" size="sm" onClick={() => navigate(userRole === "admin" ? "/admin/dashboard" : "/student/dashboard")} className="rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all">
                        <User className="w-4 h-4 mr-2" />
                        {userRole === "admin" ? "Admin Panel" : "Dashboard"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </> : <>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="rounded-xl text-gray-600 hover:text-emerald-700 font-medium">
                        Log In
                      </Button>
                      <Button variant="default" size="sm" onClick={() => navigate("/register")} className="rounded-xl active:scale-95 transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                        Get Started
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </>}
                  </div>}
                </div>
              </div>
            </header>

            {/* Hero Section with Integrated Header (Mobile only) */}
            <section className="relative flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-8 overflow-hidden">


              {/* Mobile App Header - Enhanced Native Style */}
              <div className="md:hidden">
                <div className="px-5 pt-4 pb-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-2 shadow-sm border border-gray-100"
                    >
                      <img src="/favicon.svg" alt="Practice Koro" className="w-full h-full object-contain" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <span className="text-xl font-bold text-gray-900 tracking-tight block leading-tight">Practice Koro</span>
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> #1 Mock Test Platform
                      </span>
                    </motion.div>
                  </div>
                  {!isLoggedIn ? (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => navigate("/login")}
                      className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-emerald-50 border border-emerald-100 min-w-[56px] min-h-[56px]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700">Sign In</span>
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg cursor-pointer ring-2 ring-white"
                      style={{ filter: 'drop-shadow(0 4px 10px rgba(16, 185, 129, 0.3))' }}
                      onClick={() => navigate(userRole === "admin" ? "/admin/dashboard" : "/student/dashboard")}
                    >
                      {userProfile?.full_name?.[0]?.toUpperCase() || "U"}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Mobile App Content */}
              <div className="md:hidden flex-1 px-5 pb-8 flex flex-col">
                {/* Welcome Card - 3D Style */}
                <motion.div
                  initial={{ opacity: 0, y: 30, rotateX: 10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-[28px] p-6 mb-6 relative overflow-hidden"
                >
                  {/* Animated decorative elements */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.15, 0.1] }}
                    transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                    className="absolute -bottom-12 -left-12 w-36 h-36 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute top-4 right-6"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                          {new Date().getHours() < 12 ? "🌅 Good Morning" : new Date().getHours() < 17 ? "☀️ Good Afternoon" : "🌙 Good Evening"}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-2 leading-tight">Crack WBSSC, WBP & Railway Exams</h2>
                    <p className="text-emerald-100 text-sm mb-5 leading-relaxed max-w-[260px]">
                      Practice with curated mock tests & study materials
                    </p>
                    {!isLoggedIn ? (
                      <Button
                        onClick={() => navigate("/register")}
                        className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl px-6 py-3 active:scale-95 transition-all text-sm"
                      >
                        Get Started Free
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate(userRole === "admin" ? "/admin/dashboard" : "/student/dashboard")}
                        className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl px-6 py-3 active:scale-95 transition-all text-sm"
                      >
                        Continue Practice
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </motion.div>

                {/* Quick Actions - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">Quick Actions</h3>
                    <span className="text-xs text-gray-500 font-medium">Tap to explore</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: BookOpen, label: "Exams", color: "from-blue-500 to-indigo-600", bgLight: "bg-blue-50", path: "/student/exam" },
                      { icon: FileText, label: "Notes", color: "from-orange-500 to-red-500", bgLight: "bg-orange-50", path: "/student/notes" },
                      { icon: Trophy, label: "Results", color: "from-purple-500 to-pink-600", bgLight: "bg-purple-50", path: "/student/results" },
                    ].map((item, index) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 + index * 0.08, type: "spring", bounce: 0.3 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => isLoggedIn ? navigate(item.path) : navigate("/login")}
                        className={`flex flex-col items-center gap-3 p-5 rounded-3xl ${item.bgLight} border border-gray-100/50 transition-colors`}
                      >
                        <motion.div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}
                          style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))' }}
                        >
                          <item.icon className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-sm font-bold text-gray-700">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Stats Row - Premium Style */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                  className="grid grid-cols-2 gap-3 mb-6"
                >
                  <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100/50">
                    <motion.div
                                className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center"
                                style={{ filter: 'drop-shadow(0 4px 10px rgba(59, 130, 246, 0.3))' }}
                            >
                                <img src="/favicon.svg" alt="Practice Koro Logo" className="w-full h-full object-contain" />
                            </motion.div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{featuredTests.length}+</p>
                    <p className="text-[11px] text-gray-600 font-bold uppercase mt-0.5">Tests</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 via-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100/50">
                    <div
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center"
                      style={{ filter: 'drop-shadow(0 4px 10px rgba(168, 85, 247, 0.3))' }}
                    >
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{exams.length}+</p>
                    <p className="text-[11px] text-gray-600 font-bold uppercase mt-0.5">Exams</p>
                  </div>
                </motion.div>

                {/* Featured Tests - Enhanced Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                  className="flex-1"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-gray-900">Featured Tests</h3>
                    <button onClick={() => isLoggedIn ? navigate("/student/exam") : navigate("/login")} className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:text-emerald-800">
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {featuredTests.slice(0, 4).map((test, index) => (
                      <motion.div
                        key={test.id}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.08 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStartTest(test.id)}
                        className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-gray-200 transition-colors"
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${test.test_type === "full_mock"
                          ? "bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600"
                          : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
                          }`}>
                          {test.test_type === "full_mock" ? <Award className="w-7 h-7 text-white" /> : <BookOpen className="w-7 h-7 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${test.test_type === "full_mock"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-orange-100 text-orange-700"
                              }`}>
                              {test.test_type === "full_mock" ? "Full Mock" : "Topic-wise"}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm truncate">{test.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" />{test.duration_minutes} min</span>
                            <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5 text-emerald-500" />{test.total_marks} marks</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <PlayCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Desktop Hero Content - Premium Two-Column Layout */}
              <div className="hidden md:flex flex-1 container mx-auto px-6 lg:px-12 flex-col justify-center relative z-10 pt-24 pb-16">
                <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-12 lg:gap-16 items-center max-w-7xl mx-auto w-full">
                  {/* Left Content */}
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="space-y-8 relative z-10"
                  >
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full py-2 px-4 shadow-sm"
                      >
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                          #1 Mock Test Platform for Govt Exams
                        </span>
                      </motion.div>

                      <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
                        Crack <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">WBSSC, WBP</span>
                        <br />
                        & Railway Exams
                      </h2>

                      <p className="text-lg text-gray-600 max-w-lg leading-relaxed font-medium">
                        Attempt selection-oriented mock tests, analyze your performance with AI, and secure your government job.
                      </p>
                    </div>

                    {/* CTA Buttons */}
                    {!isLoggedIn ? (
                      <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <Button
                          size="lg"
                          variant="default"
                          onClick={() => navigate("/register")}
                          className="h-14 px-8 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1"
                        >
                          Attempt Free Mock Test
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => navigate("/login")}
                          className="h-14 px-8 rounded-2xl text-base font-bold border-2 border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                        >
                          <PlayCircle className="w-5 h-5 mr-2" />
                          Watch Demo
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-start pt-2">
                        <Button
                          size="lg"
                          variant="default"
                          onClick={() => navigate(userRole === "admin" ? "/admin/dashboard" : "/student/dashboard")}
                          className="h-14 px-8 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1"
                        >
                          {userRole === "admin" ? "Go to Admin Panel" : "Go to Dashboard"}
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    )}

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-100">
                      <div>
                        <p className="text-3xl font-black text-gray-900">50K+</p>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Students</p>
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">300+</p>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Mock Tests</p>
                      </div>
                      <div>
                        <p className="text-3xl font-black text-gray-900">95%</p>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Success Rate</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Right Visual - Floating Cards Illustration */}
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    className="relative hidden lg:block"
                  >
                    {/* Main Container */}
                    <div className="relative w-full max-w-lg mx-auto flex items-center justify-center lg:justify-center scale-[0.85]">
                      {/* Background Glow REMOVED as requested */}

                      <div className="relative w-full max-w-[300px] mx-auto z-20 perspective-1000 aspect-[9/19]">
                        {/* Phone Frame */}
                        <motion.div
                          initial={{ y: 20, opacity: 0, rotateY: 0, rotateZ: 0 }}
                          animate={{ y: 0, opacity: 1, rotateY: 0, rotateZ: 0 }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                          className="absolute inset-0 bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-gray-900 ring-1 ring-gray-900/5 z-20 transform transition-all duration-500"
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          {/* Glass Reflection Overlay REMOVED as requested */}

                          {/* Dynamic Island / Notch */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-30 flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-800/50"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/30"></div>
                          </div>

                          {/* Screen Content */}
                          <div className="w-full h-full bg-slate-50 flex flex-col pt-10 px-4 relative">

                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                              <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Good Morning</p>
                                <h4 className="text-lg font-black text-gray-900">Choose Exam</h4>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-white shadow-sm">
                                <User className="w-4 h-4 text-emerald-600" />
                              </div>
                            </div>

                            {/* Search Bar */}
                            <div className="h-10 bg-white rounded-xl border border-gray-100 shadow-sm mb-6 flex items-center px-3 gap-2">
                              <div className="w-4 h-4 rounded-full border-2 border-gray-200"></div>
                              <div className="h-2 w-24 bg-gray-100 rounded-full"></div>
                            </div>

                            {/* Exam Cards */}
                            <div className="space-y-3">
                              {/* Card 1: WBP (Active) */}
                              <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="bg-emerald-600 p-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 border border-emerald-500 flex items-center gap-3.5 relative overflow-hidden"
                              >
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                                  <Shield className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 relative z-10">
                                  <h5 className="font-bold text-white text-sm">West Bengal Police</h5>
                                  <p className="text-[10px] text-emerald-100 font-medium">Selected • 12 Tests New</p>
                                </div>
                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                </div>
                              </motion.div>

                              {/* Card 2: WBSSC */}
                              <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3.5 hover:bg-gray-50 transition-colors"
                              >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                                  <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-bold text-gray-900 text-sm">WBSSC SLST</h5>
                                  <p className="text-[10px] text-gray-500 font-medium">PT & Mains Full Mock</p>
                                </div>
                              </motion.div>

                              {/* Card 3: Railway */}
                              <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3.5 hover:bg-gray-50 transition-colors"
                              >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
                                  <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-bold text-gray-900 text-sm">Railway Group D</h5>
                                  <p className="text-[10px] text-gray-500 font-medium">NTPC & ALP Live Test</p>
                                </div>
                              </motion.div>
                            </div>

                            {/* Floating CTA */}
                            <motion.div
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 1 }}
                              className="absolute bottom-6 left-4 right-4"
                            >
                              <button className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-xl shadow-gray-900/20 flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all">
                                <span>Attempt Mock Test</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </motion.div>

                          </div>
                        </motion.div>

                        {/* Decorative Background Blobs for Phone */}
                        <div className="absolute top-10 -right-10 w-40 h-40 bg-emerald-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="absolute bottom-10 -left-10 w-40 h-40 bg-blue-300 rounded-full blur-3xl opacity-20 animate-pulse delay-700"></div>

                        {/* Floating Success Badge */}
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute top-20 -left-8 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 z-30"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Accuracy</p>
                            <p className="text-sm font-black text-gray-900">92%</p>
                          </div>
                        </motion.div>

                        {/* New Floating Live Badge */}
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                          className="absolute bottom-32 -right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 z-30"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          <p className="text-[10px] font-bold text-gray-800">Live: 240+</p>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section >

            {/* Exams Section - Premium Redesign */}
            <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-[120px] opacity-40" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-100 rounded-full blur-[100px] opacity-40" />
              </div>

              <div className="container mx-auto px-4 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-10 md:mb-14">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 mb-4">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Choose Your Goal</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-3">
                      Target <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Exams</span>
                    </h3>
                    <p className="text-gray-500 text-sm md:text-base font-medium max-w-md mx-auto">
                      Select your exam category and start your preparation journey
                    </p>
                  </motion.div>
                </div>

                {exams.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="max-w-5xl mx-auto">
                    <div
                      className="
                        flex flex-wrap justify-center gap-5 px-4 pb-6
                        md:gap-6 md:pb-0
                      "
                      style={{
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      {exams.map((exam, index) => {
                        const colors = [
                          { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600" },
                          { bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600" },
                          { bg: "bg-purple-500", light: "bg-purple-50", text: "text-purple-600" },
                          { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600" },
                        ];
                        const color = colors[index % colors.length];

                        return (
                          <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.08 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => isLoggedIn ? navigate("/student/exam") : navigate("/login")}
                            className="w-full max-w-[280px] md:w-[240px] md:max-w-none cursor-pointer group text-left"
                          >
                            <div className="bg-white rounded-2xl overflow-hidden h-full border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300">
                              {/* Top accent bar */}
                              <div className={`h-1.5 ${color.bg}`} />

                              <div className="p-5">
                                {/* Icon */}
                                <div className={`w-12 h-12 ${color.light} rounded-xl flex items-center justify-center mb-4`}>
                                  <BookOpen className={`w-6 h-6 ${color.text}`} />
                                </div>

                                {/* Title */}
                                <h4 className="text-lg font-bold text-gray-900 mb-1">
                                  {exam.name}
                                </h4>

                                {/* Subtitle */}
                                <p className="text-sm text-gray-400 mb-4">Practice Tests</p>

                                {/* CTA */}
                                <div className={`flex items-center gap-2 ${color.text} text-sm font-semibold`}>
                                  <span>Start Now</span>
                                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* View All Link */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      viewport={{ once: true }}
                      className="text-center mt-8"
                    >
                      <button
                        onClick={() => isLoggedIn ? navigate("/student/exam") : navigate("/login")}
                        className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
                      >
                        View All Exams
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  </div>
                )}
              </div>
            </section>

            {/* Featured Tests Section - Premium Redesign */}
            <section className="py-16 sm:py-24 md:py-32 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
              {/* Decorative Background Elements */}
              < div className="absolute inset-0 overflow-hidden pointer-events-none" >
                <div className="absolute -top-10 -left-10 w-52 sm:w-80 h-52 sm:h-80 bg-gradient-to-br from-emerald-200/40 to-teal-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-60 sm:w-96 h-60 sm:h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/20 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-blue-100/30 to-cyan-100/20 rounded-full blur-3xl" />
              </div >

              <div className="container mx-auto px-5 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-6 sm:mb-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 rounded-full px-3 py-1.5 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 text-xs font-medium">Practice Tests</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                      Featured <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Mock Tests</span>
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto px-2">
                      Handpicked tests to boost your preparation
                    </p>
                  </motion.div>
                </div>

                {/* Filter Tabs - Compact Mobile Style */}
                <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto pb-1 -mx-2 px-2">
                  <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200">
                    {[
                      { key: "all", label: "All", icon: Target },
                      { key: "full_mock", label: "Full", icon: Award },
                      { key: "topic_wise", label: "Topic", icon: BookOpen },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setFilterType(tab.key as "all" | "full_mock" | "topic_wise")}
                        className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${filterType === tab.key
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                          : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tests Grid */}
                {filteredTests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <FileQuestion className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No tests available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto pt-4">
                    {filteredTests.map((test, index) => (
                      <motion.div
                        key={test.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className="group relative bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all duration-200 overflow-hidden sm:hover:-translate-y-1 active:scale-[0.98] sm:active:scale-100">
                          {/* Glow Effect on Hover */}
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-teal-50/0 group-hover:from-emerald-50/50 group-hover:to-teal-50/30 transition-all duration-200" />

                          {/* Top Gradient Bar */}
                          <div className={`h-1.5 w-full ${test.test_type === "full_mock"
                            ? "bg-gradient-to-r from-purple-500 via-violet-500 to-purple-400"
                            : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400"
                            }`} />

                          <div className="p-4 sm:p-5 relative">
                            {/* Header Row */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${test.test_type === "full_mock"
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                                }`}>
                                {test.test_type === "full_mock" ? (
                                  <><Award className="w-3.5 h-3.5" /> Full Mock</>
                                ) : (
                                  <><BookOpen className="w-3.5 h-3.5" /> Topic-wise</>
                                )}
                              </span>
                              <div className="flex items-center gap-1 text-emerald-600 text-xs">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Quick Start</span>
                              </div>
                            </div>

                            {/* Title & Description */}
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                              {test.title}
                            </h4>
                            {test.description && (
                              <p className="text-gray-600 text-xs sm:text-sm font-medium line-clamp-2 mb-3">
                                {test.description}
                              </p>
                            )}

                            {/* Stats Row */}
                            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                              <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-gray-700 text-xs font-medium">{test.duration_minutes} min</span>
                              </div>
                              <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
                                <Target className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-gray-700 text-xs font-medium">{test.total_marks} marks</span>
                              </div>
                            </div>

                            {/* Exam/Subject Badge */}
                            {(test.exams?.name || test.subjects?.name) && (
                              <div className="flex items-center gap-1.5 text-gray-600 text-xs font-semibold mb-3">
                                <FileText className="w-3 h-3" />
                                <span>{test.test_type === "full_mock" ? test.exams?.name : (test.subjects?.name || test.exams?.name)}</span>
                              </div>
                            )}

                            {/* CTA Button */}
                            <Button
                              onClick={() => handleStartTest(test.id)}
                              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl py-6 text-base transition-all duration-150"
                            >
                              <PlayCircle className="w-5 h-5 mr-2" />
                              Start Test
                              <ChevronRight className="w-5 h-5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* View All Button */}
                {filteredTests.length > 0 && (
                  <div className="text-center mt-6 sm:mt-8">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/login")}
                      className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-8 py-5"
                    >
                      View All Tests
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </section >

            {/* Features Section - Modern Bento Grid Design */}
            <section id="features" className="py-24 sm:py-32 bg-slate-50">
              <div className="container mx-auto px-5">
                {/* Section Header - Clean & Minimal */}
                <div className="text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      Why Practice Koro?
                    </span>
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                      Complete Ecosystem for <span className="text-emerald-600">Govt Exam Prep</span>
                    </h3>
                    <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">
                      All the tools you need to secure a top rank in WBP, SSC, and Railway exams
                    </p>
                  </motion.div>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto pt-4 overflow-hidden">
                  {/* Card 1 - Large */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    viewport={{ once: true }}
                    className="col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold mb-2">Instant Results</h4>
                      <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                        Get detailed scorecards and explanations immediately after every test
                      </p>
                    </div>
                  </motion.div>

                  {/* Card 2 - Small */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    viewport={{ once: true }}
                    className="col-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Updated Content</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs">Latest exam patterns</p>
                  </motion.div>

                  {/* Card 3 - Small */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    viewport={{ once: true }}
                    className="col-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                      <Library className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Study Vault</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs">Curated PDFs & notes</p>
                  </motion.div>

                  {/* Card 4 - Small */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="col-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                      <LineChart className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">AI Analytics</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs">Track your progress</p>
                  </motion.div>

                  {/* Card 5 - Small */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    viewport={{ once: true }}
                    className="col-span-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-3">
                      <Target className="w-5 h-5 text-rose-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Topic-wise</h4>
                    <p className="text-slate-500 text-[11px] sm:text-xs">Focused practice</p>
                  </motion.div>

                  {/* Card 6 - Large Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="col-span-2 bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-6 sm:gap-8">
                        <div>
                          <p className="text-3xl sm:text-4xl font-bold text-emerald-400">1000+</p>
                          <p className="text-white/60 text-xs sm:text-sm">Mock Tests</p>
                        </div>
                        <div className="w-px h-10 bg-white/20" />
                        <div>
                          <p className="text-3xl sm:text-4xl font-bold text-emerald-400">50K+</p>
                          <p className="text-white/60 text-xs sm:text-sm">Students</p>
                        </div>
                        <div className="w-px h-10 bg-white/20 hidden sm:block" />
                        <div className="hidden sm:block">
                          <p className="text-3xl sm:text-4xl font-bold text-emerald-400">95%</p>
                          <p className="text-white/60 text-xs sm:text-sm">Success Rate</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <HowItWorks />


            {/* App Download Section - Green & White Theme with Phone Mockup */}
            <section className="py-12 sm:py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative">
              {/* Subtle Background Decoration */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-100 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 opacity-60" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-teal-100 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 opacity-60" />
              </div>

              <div className="container mx-auto px-5 relative z-10">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10 lg:gap-14">

                  {/* Left - Phone Mockup - Hidden on very small screens */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="hidden sm:flex flex-1 relative order-2 md:order-1 mt-8 md:mt-0 justify-center items-center"
                  >
                    <div className="relative w-44 sm:w-48 md:w-52 lg:w-56">
                      {/* Outer Glow */}
                      <div className="absolute inset-0 bg-emerald-200/30 rounded-[2.5rem] blur-2xl scale-110" />

                      {/* Phone Container */}
                      <div className="relative bg-slate-800 rounded-[2.5rem] p-2 ring-1 ring-slate-700 z-10">
                        {/* Speaker/Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-xl z-30 flex items-center justify-center">
                          <div className="w-8 h-1 bg-slate-700 rounded-full" />
                        </div>

                        {/* Screen Content */}
                        <div className="bg-slate-50 rounded-[2rem] overflow-hidden aspect-[9/18] relative select-none touch-none flex flex-col">
                          {/* App Header with Timer */}
                          <div className="bg-emerald-600 p-4 pb-6 text-white relative">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-xs font-medium opacity-90">Mock Test #105</span>
                              <div className="bg-emerald-700/50 px-2 py-1 rounded text-xs font-mono">09:59</div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-4 bg-slate-50 rounded-t-[1.5rem]" />
                          </div>

                          {/* Test Question Content */}
                          <div className="px-4 -mt-2 flex-1 flex flex-col pb-4">
                            {/* Question Card */}
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Indian History</span>
                                <span className="text-[10px] text-gray-400">Q. 5/20</span>
                              </div>
                              <p className="text-xs text-gray-800 font-bold leading-relaxed font-bengali">
                                সুভাষচন্দ্র বসুর রাজনৈতিক গুরু কে ছিলেন?
                              </p>
                            </div>

                            {/* Options - hidden on very small screens */}
                            <div className="hidden sm:block space-y-2 mb-auto">
                              {[
                                { id: "A", text: "মহাত্মা গান্ধী", active: false },
                                { id: "B", text: "লালা লাজপত রায়", active: false },
                                { id: "C", text: "চিত্তরঞ্জন দাশ", active: true },
                                { id: "D", text: "গোপাল কৃষ্ণ গোখলে", active: false },
                              ].map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs font-medium transition-colors ${opt.active
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                    : "bg-white border-gray-100 text-gray-600"
                                    }`}
                                >
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${opt.active ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 text-gray-400"
                                    }`}>
                                    {opt.active && <CheckCircle className="w-3 h-3" />}
                                    {!opt.active && <span className="text-[9px]">{opt.id}</span>}
                                  </div>
                                  {opt.text}
                                </div>
                              ))}
                            </div>

                            {/* Simple options for mobile */}
                            <div className="sm:hidden flex-1 flex flex-col justify-center gap-2">
                              <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-white text-xs">
                                <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">A</span>
                                <span className="text-gray-500">Option A</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500 bg-emerald-50 text-xs">
                                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <CheckCircle className="w-2.5 h-2.5 text-white" />
                                </span>
                                <span className="text-emerald-700 font-medium">Option C ✓</span>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="bg-emerald-600 text-white text-center py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs shadow-lg shadow-emerald-500/30 mt-2">
                              Save & Next
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Install Badge */}
                      <motion.div
                        animate={{
                          y: [0, -5, 0],
                          scale: [1, 1.02, 1]
                        }}
                        transition={{
                          y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                          scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute -top-2 -right-2 sm:top-4 sm:right-2 z-20 bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 border-white flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      >
                        <Download className="w-3 h-3" />
                        <span>Install</span>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Right - Content */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="flex-1 text-center md:text-left order-1 md:order-2"
                  >
                    <span className="inline-block mb-3 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      📱 Install App
                    </span>

                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 leading-tight">
                      Get Practice Koro{' '}
                      <span className="text-emerald-600">On Your Phone</span>
                    </h3>

                    <p className="text-slate-500 text-sm sm:text-base mb-6 max-w-md mx-auto md:mx-0">
                      Install directly from your browser. No app store needed, works on all devices.
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-2 mb-6 max-w-sm mx-auto md:mx-0">
                      {[
                        { icon: Zap, text: "Instant Launch", color: "text-amber-600" },
                        { icon: Download, text: "No Storage", color: "text-blue-600" },
                        { icon: Smartphone, text: "Native Feel", color: "text-purple-600" },
                        { icon: CheckCircle, text: "One Click", color: "text-emerald-600" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-100"
                        >
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                          <span className="font-medium text-slate-700 text-xs">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Install Button */}
                    <Button
                      size="lg"
                      onClick={() => {
                        const event = new CustomEvent('show-pwa-prompt');
                        window.dispatchEvent(event);
                      }}
                      className="text-sm sm:text-base font-bold py-5 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Install Free App
                    </Button>
                    <p className="mt-2 text-slate-400 text-[11px]">
                      Works on all devices • No download required
                    </p>
                  </motion.div>

                </div>
              </div>
            </section>

            {/* Latest Blogs Section */}
            <LatestBlogs />

            <Footer />
          </motion.div >
        )}
      </AnimatePresence >

      {/* PWA Install Prompt handled globally in App.tsx */}
    </>
  );
};
export default Landing;