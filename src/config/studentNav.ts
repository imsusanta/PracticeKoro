import {
  Home,
  ClipboardList,
  Target,
  BookOpen,
  UserRound,
  BarChart3,
  RotateCcw,
  Trophy
} from "lucide-react";

// Mobile Bottom Navigation (5 Core Pillars: Home, Exams, Practice, Study, Profile)
// Results stay reachable via Test Result → Detailed Analysis → Profile → My Performance.
export const studentNav = [
  { name: "Home", path: "/student/dashboard", icon: Home },
  { name: "Exams", path: "/student/exam", icon: ClipboardList },
  { name: "Practice", path: "/student/practice", icon: Target },
  { name: "Study", path: "/student/notes", icon: BookOpen },
  { name: "Profile", path: "/student/profile", icon: UserRound },
];

// Desktop Sidebar Menu
export const studentFullNav = [
  { name: "Dashboard", path: "/student/dashboard", icon: Home },
  { name: "Exams & Mocks", path: "/student/exam", icon: ClipboardList },
  { name: "Practice", path: "/student/practice", icon: Target },
  { name: "Test Results", path: "/student/results", icon: BarChart3 },
  { name: "Study Notes", path: "/student/notes", icon: BookOpen },
  { name: "Mistakes", path: "/student/mistakes", icon: RotateCcw },
  { name: "Rank", path: "/student/leaderboard", icon: Trophy },
  { name: "My Profile", path: "/student/profile", icon: UserRound },
];
