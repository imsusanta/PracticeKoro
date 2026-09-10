import {
  Home,
  ClipboardList,
  Target,
  BookOpen,
  UserRound,
  BarChart3,
  RotateCcw,
  Trophy,
} from "lucide-react";

// Mobile Bottom Navigation (Home, Test Series, Practice, Results, Profile)
export const studentNav = [
  { name: "Home", path: "/student/dashboard", icon: Home },
  { name: "Test Series", path: "/student/exam", icon: ClipboardList },
  { name: "Practice", path: "/student/practice", icon: Target },
  { name: "Results", path: "/student/results", icon: BarChart3 },
  { name: "Profile", path: "/student/profile", icon: UserRound },
];

// Desktop Sidebar Menu
export const studentFullNav = [
  { name: "Dashboard", path: "/student/dashboard", icon: Home },
  { name: "Test Series", path: "/student/exam", icon: ClipboardList },
  { name: "Practice", path: "/student/practice", icon: Target },
  { name: "Test Results", path: "/student/results", icon: BarChart3 },
  { name: "Study Notes", path: "/student/notes", icon: BookOpen },
  { name: "Mistakes Notebook", path: "/student/mistakes", icon: RotateCcw },
  { name: "State Leaderboard", path: "/student/leaderboard", icon: Trophy },
  { name: "My Profile", path: "/student/profile", icon: UserRound },
];
