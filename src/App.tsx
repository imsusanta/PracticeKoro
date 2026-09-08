import { Suspense, lazy } from "react";
import { Navigate, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PWALogic } from "./components/PWALogic";
import OfflineIndicator from "./components/OfflineIndicator";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { PageLoader } from "./components/PageLoader";
import { RequireAdmin, RequireStudent } from "./components/auth/RequireAuth";
import { HelmetProvider } from "react-helmet-async";
import { StudentProvider } from "./contexts/StudentContext";
import ErrorBoundary from "./components/ErrorBoundary";

const StudentProviderRoute = () => (
  <StudentProvider>
    <Outlet />
  </StudentProvider>
);

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
const PracticeHub = lazy(() => import("./pages/student/PracticeHub"));
const PYQPractice = lazy(() => import("./pages/student/PYQPractice"));
const SubjectPractice = lazy(() => import("./pages/student/SubjectPractice"));
const MistakesNotebook = lazy(() => import("./pages/student/MistakesNotebook"));
const BookmarksPage = lazy(() => import("./pages/student/BookmarksPage"));
const DailyPractice = lazy(() => import("./pages/student/DailyPractice"));
const StudentLeaderboard = lazy(() => import("./pages/student/StudentLeaderboard"));
const CurrentAffairs = lazy(() => import("./pages/student/CurrentAffairs"));

// Admin Pages
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
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AIConfigSettings = lazy(() => import("./pages/admin/AIConfigSettings"));
const SendNotifications = lazy(() => import("./pages/admin/SendNotifications"));
const SubjectManagement = lazy(() => import("./pages/admin/SubjectManagement"));
const QuestionSubjectManagement = lazy(() => import("./pages/admin/QuestionSubjectManagement"));
const BulkMCQUpload = lazy(() => import("./pages/admin/BulkMCQUpload"));
const AddQuestion = lazy(() => import("./pages/admin/AddQuestion"));
const BlogManagement = lazy(() => import("./pages/admin/BlogManagement"));
const AddBlog = lazy(() => import("./pages/admin/AddBlog"));
const AddNote = lazy(() => import("./pages/admin/AddNote"));

const AppContent = () => {
  return (
    <div className="min-h-screen">
      <PWALogic />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/blog" element={<BlogList />} />
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
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin — canonical paths live here; aliases redirect */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/users" element={<Navigate to="/admin/students" replace />} />
            <Route path="/admin/exams" element={<ExamManagement />} />
            <Route path="/admin/tests" element={<MockTestCreation />} />
            <Route path="/admin/mock-tests" element={<Navigate to="/admin/tests" replace />} />
            <Route path="/admin/courses" element={<CourseManagement />} />
            <Route path="/admin/notes" element={<NotesManagement />} />
            <Route path="/admin/add-note" element={<AddNote />} />
            <Route path="/admin/chat" element={<AdminChatInbox />} />
            <Route path="/admin/support" element={<Navigate to="/admin/chat" replace />} />
            <Route path="/admin/ai-generator" element={<AIQuestionGenerator />} />
            <Route path="/admin/ai-question-generator" element={<Navigate to="/admin/ai-generator" replace />} />
            <Route path="/admin/questions" element={<QuestionBank />} />
            <Route path="/admin/question-bank" element={<Navigate to="/admin/questions" replace />} />
            <Route path="/admin/add-question" element={<AddQuestion />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/ai-settings" element={<AIConfigSettings />} />
            <Route path="/admin/ai-config" element={<Navigate to="/admin/ai-settings" replace />} />
            <Route path="/admin/notifications" element={<SendNotifications />} />
            <Route path="/admin/subjects" element={<SubjectManagement />} />
            <Route path="/admin/question-subjects" element={<QuestionSubjectManagement />} />
            <Route path="/admin/bulk-upload" element={<BulkMCQUpload />} />
            <Route path="/admin/blogs" element={<BlogManagement />} />
            <Route path="/admin/blogs/new" element={<AddBlog />} />
          </Route>

          {/* Student */}
          <Route element={<RequireStudent />}>
            <Route element={<StudentProviderRoute />}>
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/exam" element={<StudentExams />} />
              <Route path="/student/exam/:examId" element={<ExamDetail />} />
              <Route path="/student/exams" element={<Navigate to="/student/exam" replace />} />
              <Route path="/student/mocktest" element={<Navigate to="/student/exam" replace />} />
              <Route path="/student/results" element={<StudentResults />} />
              <Route path="/student/take-test/:testId" element={<TakeTest />} />
              <Route path="/student/test-review/:attemptId" element={<ReviewTest />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/notes" element={<StudentNotes />} />
              <Route path="/student/notifications" element={<StudentNotifications />} />

              {/* Core Student Practice & Retention Routes */}
              <Route path="/student/practice" element={<PracticeHub />} />
              <Route path="/student/practice/subject" element={<SubjectPractice />} />
              <Route path="/student/current-affairs" element={<CurrentAffairs />} />
              <Route path="/student/pyq" element={<PYQPractice />} />
              <Route path="/student/mistakes" element={<MistakesNotebook />} />
              <Route path="/student/bookmarks" element={<BookmarksPage />} />
              <Route path="/student/daily" element={<DailyPractice />} />
              <Route path="/student/leaderboard" element={<StudentLeaderboard />} />
            </Route>
          </Route>

          {/* Blog slugs after every static route so they cannot shadow /login etc. */}
          <Route path="/:slug" element={<BlogDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <OfflineIndicator />
      <PWAInstallPrompt />
      <Sonner />
      <Toaster />
    </div>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
