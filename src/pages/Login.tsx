import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/utils/adminAuth";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Eye, EyeOff, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: "", color: "bg-slate-200" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { level: 2, label: "Medium", color: "bg-amber-500" };
  return { level: 3, label: "Strong", color: "bg-emerald-500" };
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getErrorMessage = (error: { message?: string } | null): string => {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("invalid login credentials")) {
    return "Invalid email or password. Please check your credentials.";
  }
  if (message.includes("email not confirmed")) {
    return "Please verify your email address before logging in.";
  }
  if (message.includes("too many requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your connection.";
  }
  return error?.message || "An unexpected error occurred. Please try again.";
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [touched, setTouched] = useState({ email: false, password: false, phone: false });

  useEffect(() => {
    const checkCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const isAdmin = await checkIsAdmin(session.user.id);
        if (isAdmin) {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/student/dashboard", { replace: true });
        }
      }
    };
    checkCurrentSession();
  }, [navigate]);

  const [emailFormData, setEmailFormData] = useState({
    email: "",
    password: "",
  });

  const [phoneFormData, setPhoneFormData] = useState({
    phoneNumber: "",
    password: "",
  });

  const emailValidation = useMemo(() => {
    if (!touched.email || !emailFormData.email) return { valid: true, message: "" };
    if (!isValidEmail(emailFormData.email)) return { valid: false, message: "Enter a valid email address" };
    return { valid: true, message: "" };
  }, [emailFormData.email, touched.email]);

  const passwordStrength = useMemo(() => getPasswordStrength(emailFormData.password), [emailFormData.password]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(emailFormData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: emailFormData.email,
      password: emailFormData.password,
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Login Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return;
    }

    setLoading(false);
    toast({
      title: "Welcome Back!",
      description: "Signed in successfully.",
    });

    if (authData.user) {
      const isAdmin = await checkIsAdmin(authData.user.id);
      if (isAdmin) {
        navigate("/admin/dashboard");
        return;
      }
    }
    navigate("/student/dashboard");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/student/dashboard`,
      },
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Login Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phoneFormData.phoneNumber)) {
      toast({
        title: "Invalid Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const pseudoEmail = `${phoneFormData.phoneNumber}@whatsapp.practicekoro.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: phoneFormData.password,
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Login Failed",
        description: "Invalid phone number or password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(false);
    toast({
      title: "Welcome Back!",
      description: "Signed in successfully.",
    });
    navigate("/student/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 md:p-8">
      {/* Container Card Matching Screen 3 of Reference Image */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs border border-slate-100 bg-white">
            <img src="/logo-icon.png" alt="PracticeKoro" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center">
            <span className="text-lg font-black tracking-tight text-[#0F172A]">Practice</span>
            <span className="text-lg font-black tracking-tight text-[#0066FF]">Koro</span>
          </div>
        </div>

        {/* Welcome Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sign in to continue your preparation
          </p>
        </div>

        {/* Pill Tab Switcher: [ Login | Register ] */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-6">
          <button
            type="button"
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-white text-blue-700 shadow-2xs transition-all"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-all"
          >
            Register
          </button>
        </div>

        {/* Login Form */}
        {loginMethod === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white focus:border-blue-400 transition-all"
                  value={emailFormData.email}
                  onChange={(e) => setEmailFormData({ ...emailFormData, email: e.target.value })}
                  onBlur={() => setTouched({ ...touched, email: true })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Password</Label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="h-11 pl-10 pr-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white focus:border-blue-400 transition-all"
                  value={emailFormData.password}
                  onChange={(e) => setEmailFormData({ ...emailFormData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            {/* Phone Field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Phone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="tel"
                  required
                  placeholder="10-digit number"
                  maxLength={10}
                  className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white focus:border-blue-400 transition-all"
                  value={phoneFormData.phoneNumber}
                  onChange={(e) => setPhoneFormData({ ...phoneFormData, phoneNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Password</Label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="h-11 pl-10 pr-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white focus:border-blue-400 transition-all"
                  value={phoneFormData.password}
                  onChange={(e) => setPhoneFormData({ ...phoneFormData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login with Phone"
              )}
            </Button>
          </form>
        )}

        {/* OR Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">OR</span>
          </div>
        </div>

        {/* Social / Alternative Buttons Matching Screen 3 */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-2xs active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => setLoginMethod(loginMethod === "email" ? "phone" : "email")}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-2xs active:scale-95 transition-all"
          >
            {loginMethod === "email" ? (
              <>
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Continue with Phone</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Continue with Email</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 font-medium mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 underline">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
