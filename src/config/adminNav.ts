import {
  Users,
  BookOpen,
  FileQuestion,
  NotebookPen,
  TestTube2,
  Sparkles,
  Upload,
  MessageCircle,
  FolderOpen,
  Bell,
  Settings,
  LayoutDashboard,
  Newspaper,
  Globe,
  LucideIcon
} from "lucide-react";

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "EXAM ENGINE",
    items: [
      { name: "Exam Management", path: "/admin/exams", icon: BookOpen },
      { name: "Mock Tests", path: "/admin/tests", icon: TestTube2 },
      { name: "Question Bank", path: "/admin/questions", icon: FileQuestion },
      { name: "AI Question Generator", path: "/admin/ai-generator", icon: Sparkles },
      { name: "Bulk MCQ Upload", path: "/admin/bulk-upload", icon: Upload },
    ]
  },
  {
    title: "CURRICULUM",
    items: [
      { name: "Question Subjects", path: "/admin/question-subjects", icon: FolderOpen },
      { name: "Notes Subjects", path: "/admin/subjects", icon: FolderOpen },
    ]
  },
  {
    title: "STUDENTS & SALES",
    items: [
      { name: "Student Management", path: "/admin/students", icon: Users },
    ]
  },
  {
    title: "CONTENT & CMS",
    items: [
      { name: "Current Affairs", path: "/admin/current-affairs", icon: Globe },
      { name: "Study Notes", path: "/admin/notes", icon: NotebookPen },
      { name: "Blog Management", path: "/admin/blogs", icon: Newspaper },
    ]
  },
  {
    title: "COMMUNICATION",
    items: [
      { name: "Send Notifications", path: "/admin/notifications", icon: Bell },
      { name: "Chat Inbox", path: "/admin/chat", icon: MessageCircle },
    ]
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Admin Settings", path: "/admin/settings", icon: Settings },
      { name: "AI Settings", path: "/admin/ai-settings", icon: Settings },
    ]
  }
];

// Flattened for backward compatibility
export const managementTools: NavItem[] = navSections.flatMap(section => section.items);



