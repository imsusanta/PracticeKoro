import { Suspense, lazy } from "react";
import { Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PWALogic } from "./components/PWALogic";
import OfflineIndicator from "./components/OfflineIndicator";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { HelmetProvider } from "react-helmet-async";
import ProtectedRoute from "./components/ProtectedRoute";
import { StudentProvider } from "./contexts/StudentContext";
import ErrorBoundary from "./components/ErrorBoundary";

const StudentProviderRoute = () => (
  <StudentProvider>
    <Outlet />
  </StudentProvider>
);

const ExamsRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/student/exam${location.search}`} replace />;
};

// Lazy loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Install = lazy(() => import("./pages/Install"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const BlogList = lazy(() => import("./pages/BlogList"));

// Legal Pages
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentExams = lazy(() => import("./pages/student/StudentExams"));
const ExamDetail = lazy(() => import("./pages/student/ExamDetail"));
const StudentResults = lazy(() => import("./pages/student/StudentResults"));
const TakeTest = lazy(() => import("./pages/student/TakeTest"));
const ReviewTest = lazy(() => import("./pages/student/ReviewTest"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentNotes = lazy(() => import("./pages/student/StudentNotes"));
const StudentNotifications = lazy(() => import("./pages/student/StudentNotifications"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Core Learning & Retention Pages
const PracticeHub = lazy(() => import("./pages/student/PracticeHubRedesign"));
const PYQPractice = lazy(() => import("./pages/student/PYQPractice"));
const SubjectPractice = lazy(() => import("./pages/student/SubjectPractice"));
const MistakesNotebook = lazy(() => import("./pages/student/MistakesNotebook"));
const BookmarksPage = lazy(() => import("./pages/student/BookmarksPage"));
const DailyPractice = lazy(() => import("./pages/student/DailyPractice"));
const StudentLeaderboard = lazy(() => import("./pages/student/StudentLeaderboard"));
const CurrentAffairs = lazy(() => import("./pages/student/CurrentAffairs"));
const StudentPerformance = lazy(() => import("./pages/student/StudentPerformance"));

// Admin Pages
const AdminIndex = lazy(() => import("./pages/admin/AdminIndex"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const StudentManagement = lazy(() => import("./pages/admin/StudentManagement"));
const ExamManagement = lazy(() => import("./pages/admin/ExamManagement"));
const MockTestCreation = lazy(() => import("./pages/admin/MockTestCreation"));
const CourseManagement = lazy(() => import("./pages/admin/CourseManagement"));
const NotesManagement = lazy(() => import("./pages/admin/NotesManagement"));
const AdminChatInbox = lazy(() => import("./pages/admin/AdminChatInbox"));
const AIQuestionGenerator = lazy(() => import("./pages/admin/AIQuestionGenerator"));
const QuestionBank = lazy(() => import("./pages/admin/QuestionBank"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AIConfigSettings = lazy(() => import("./pages/admin/AIConfigSettings"));
const SendNotifications = lazy(() => import("./pages/admin/SendNotifications"));
const SubjectManagement = lazy(() => import("./pages/admin/SubjectManagement"));
const QuestionSubjectManagement = lazy(() => import("./pages/admin/QuestionSubjectManagement"));
const BulkMCQUpload = lazy(() => import("./pages/admin/BulkMCQUpload"));
const AddQuestion = lazy(() => import("./pages/admin/AddQuestion"));
const BlogManagement = lazy(() => import("./pages/admin/BlogManagement"));
const AddBlog = lazy(() => import("./pages/admin/AddBlog"));
const AddNote = lazy(() => import("./pages/admin/AddNote"));
const CurrentAffairsManagement = lazy(() => import("./pages/admin/CurrentAffairsManagement"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500 font-medium">Loading PracticeKoro...</p>
    </div>
  </div>
);

const AppContent = () => (
  <div className="min-h-screen">
    <PWALogic />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/admin" element={<AdminIndex />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requireRole="admin"><StudentManagement /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute requireRole="admin"><StudentManagement /></ProtectedRoute>} />
        <Route path="/admin/exams" element={<ProtectedRoute requireRole="admin"><ExamManagement /></ProtectedRoute>} />
        <Route path="/admin/mock-tests" element={<ProtectedRoute requireRole="admin"><MockTestCreation /></ProtectedRoute>} />
        <Route path="/admin/tests" element={<ProtectedRoute requireRole="admin"><MockTestCreation /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute requireRole="admin"><CourseManagement /></ProtectedRoute>} />
        <Route path="/admin/notes" element={<ProtectedRoute requireRole="admin"><NotesManagement /></ProtectedRoute>} />
        <Route path="/admin/support" element={<ProtectedRoute requireRole="admin"><AdminChatInbox /></ProtectedRoute>} />
        <Route path="/admin/chat" element={<ProtectedRoute requireRole="admin"><AdminChatInbox /></ProtectedRoute>} />
        <Route path="/admin/ai-question-generator" element={<ProtectedRoute requireRole="admin"><AIQuestionGenerator /></ProtectedRoute>} />
        <Route path="/admin/ai-generator" element={<ProtectedRoute requireRole="admin"><AIQuestionGenerator /></ProtectedRoute>} />
        <Route path="/admin/question-bank" element={<ProtectedRoute requireRole="admin"><QuestionBank /></ProtectedRoute>} />
        <Route path="/admin/questions" element={<ProtectedRoute requireRole="admin"><QuestionBank /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/ai-config" element={<ProtectedRoute requireRole="admin"><AIConfigSettings /></ProtectedRoute>} />
        <Route path="/admin/ai-settings" element={<ProtectedRoute requireRole="admin"><AIConfigSettings /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute requireRole="admin"><SendNotifications /></ProtectedRoute>} />
        <Route path="/admin/subjects" element={<ProtectedRoute requireRole="admin"><SubjectManagement /></ProtectedRoute>} />
        <Route path="/admin/question-subjects" element={<ProtectedRoute requireRole="admin"><QuestionSubjectManagement /></ProtectedRoute>} />
        <Route path="/admin/bulk-upload" element={<ProtectedRoute requireRole="admin"><BulkMCQUpload /></ProtectedRoute>} />
        <Route path="/admin/add-question" element={<ProtectedRoute requireRole="admin"><AddQuestion /></ProtectedRoute>} />
        <Route path="/admin/add-note" element={<ProtectedRoute requireRole="admin"><AddNote /></ProtectedRoute>} />
        <Route path="/admin/blogs" element={<ProtectedRoute requireRole="admin"><BlogManagement /></ProtectedRoute>} />
        <Route path="/admin/blogs/new" element={<ProtectedRoute requireRole="admin"><AddBlog /></ProtectedRoute>} />
        <Route path="/admin/current-affairs" element={<ProtectedRoute requireRole="admin"><CurrentAffairsManagement /></ProtectedRoute>} />

        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/:slug" element={<BlogDetail />} />
        <Route path="/install" element={<Install />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />

        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route element={<StudentProviderRoute />}>
          <Route path="/student/dashboard" element={<ProtectedRoute requireRole="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/exam" element={<ProtectedRoute requireRole="student"><StudentExams /></ProtectedRoute>} />
          <Route path="/student/exam/:examId" element={<ProtectedRoute requireRole="student"><ExamDetail /></ProtectedRoute>} />
          <Route path="/student/exams" element={<ExamsRedirect />} />
          <Route path="/student/mocktest" element={<ExamsRedirect />} />
          <Route path="/student/results" element={<ProtectedRoute requireRole="student"><StudentResults /></ProtectedRoute>} />
          <Route path="/student/take-test/:testId" element={<ProtectedRoute requireRole="student"><TakeTest /></ProtectedRoute>} />
          <Route path="/student/test-review/:attemptId" element={<ProtectedRoute requireRole="student"><ReviewTest /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute requireRole="student"><StudentProfile /></ProtectedRoute>} />
          <Route path="/student/notes" element={<ProtectedRoute requireRole="student"><StudentNotes /></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute requireRole="student"><StudentNotifications /></ProtectedRoute>} />
          <Route path="/student/practice" element={<ProtectedRoute requireRole="student"><PracticeHub /></ProtectedRoute>} />
          <Route path="/student/practice/subject" element={<ProtectedRoute requireRole="student"><SubjectPractice /></ProtectedRoute>} />
          <Route path="/student/current-affairs" element={<ProtectedRoute requireRole="student"><CurrentAffairs /></ProtectedRoute>} />
          <Route path="/student/pyq" element={<ProtectedRoute requireRole="student"><PYQPractice /></ProtectedRoute>} />
          <Route path="/student/mistakes" element={<ProtectedRoute requireRole="student"><MistakesNotebook /></ProtectedRoute>} />
          <Route path="/student/bookmarks" element={<ProtectedRoute requireRole="student"><BookmarksPage /></ProtectedRoute>} />
          <Route path="/student/daily" element={<ProtectedRoute requireRole="student"><DailyPractice /></ProtectedRoute>} />
          <Route path="/student/leaderboard" element={<ProtectedRoute requireRole="student"><StudentLeaderboard /></ProtectedRoute>} />
          <Route path="/student/performance" element={<ProtectedRoute requireRole="student"><StudentPerformance /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    <OfflineIndicator />
    <PWAInstallPrompt />
    <Sonner />
    <Toaster />
  </div>
);

const App = () => (
  <HelmetProvider>
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  </HelmetProvider>
);

export default App;
