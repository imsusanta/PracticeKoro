import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPathFor, getAccessFlags } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Eye, EyeOff, Lock, Loader2, AlertCircle, CheckCircle2, Zap, Trophy, BookOpen, Target, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

// Password strength calculation
const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: "", color: "bg-gray-200" };
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

// Email validation
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Get user-friendly error message
const getErrorMessage = (error: { message?: string } | null): string => {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please verify your email address before logging in.";
  }
  if (message.includes("too many requests")) {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your internet connection.";
  }
  return error?.message || "An unexpected error occurred. Please try again.";
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "whatsapp">("email");
  const [touched, setTouched] = useState({ email: false, password: false, whatsappNumber: false });

  const [emailFormData, setEmailFormData] = useState({
    email: "",
    password: "",
  });

  const [whatsappFormData, setWhatsappFormData] = useState({
    whatsappNumber: "",
    password: "",
  });

  // Validation states
  const emailValidation = useMemo(() => {
    if (!touched.email || !emailFormData.email) return { valid: true, message: "" };
    if (!isValidEmail(emailFormData.email)) return { valid: false, message: "Please enter a valid email address" };
    return { valid: true, message: "" };
  }, [emailFormData.email, touched.email]);

  const passwordStrength = useMemo(() => getPasswordStrength(emailFormData.password), [emailFormData.password]);
  const whatsappPasswordStrength = useMemo(() => getPasswordStrength(whatsappFormData.password), [whatsappFormData.password]);

  const validateWhatsAppNumber = (number: string): boolean => {
    return /^\d{10}$/.test(number);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pre-validation
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
      description: "You've logged in successfully.",
    });
    const flags = authData.user ? await getAccessFlags(authData.user.id) : { isAdmin: false, isStudent: true, roles: [] };
    navigate(dashboardPathFor(flags));
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

  const handleWhatsAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateWhatsAppNumber(whatsappFormData.whatsappNumber)) {
      toast({
        title: "Invalid Number",
        description: "Please enter a valid 10-digit WhatsApp number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const pseudoEmail = `${whatsappFormData.whatsappNumber}@whatsapp.practicekoro.local`;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: whatsappFormData.password,
    });

    if (error) {
      setLoading(false);
      toast({
        title: "Login Failed",
        description: "Invalid WhatsApp number or password. Please check your credentials.",
        variant: "destructive",
      });
      return;
    }

    setLoading(false);
    toast({
      title: "Welcome Back!",
      description: "You've logged in successfully.",
    });
    const flags = authData.user ? await getAccessFlags(authData.user.id) : { isAdmin: false, isStudent: true, roles: [] };
    navigate(dashboardPathFor(flags));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Left Side - Premium Branding (Fixed position - doesn't scroll) */}
      <div
        className="hidden lg:flex flex-col items-center justify-center p-8 xl:p-12 overflow-hidden"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '50%',
          height: '100vh',
          background: 'linear-gradient(135deg, #10b981 0%, #0f766e 100%)',
          zIndex: 10
        }}
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-teal-400/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-20 w-full max-w-lg flex flex-col items-center text-center">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-6 justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-2xl flex items-center justify-center">
                <Zap className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="text-left">
                <h2 className="text-4xl font-extrabold text-white tracking-tight">Practice Koro</h2>
                <div className="flex items-center gap-1.5 text-emerald-100/80 text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>#1 Mock Test Platform</span>
                </div>
              </div>
            </div>
            <p className="text-emerald-50 text-lg font-medium opacity-90 max-w-sm mx-auto">
              Your gateway to excellence. Master your exams with our premium mock tests.
            </p>
          </motion.div>

          {/* Bottom Statistics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-8 border-t border-white/10 w-full flex justify-between"
          >
            <div className="text-left">
              <p className="text-white text-2xl font-bold">50K+</p>
              <p className="text-emerald-100/60 text-[10px] uppercase font-bold tracking-widest">Active Students</p>
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">1M+</p>
              <p className="text-emerald-100/60 text-[10px] uppercase font-bold tracking-widest">Tests Taken</p>
            </div>
            <div className="text-right">
              <p className="text-white text-2xl font-bold">4.9/5</p>
              <p className="text-emerald-100/60 text-[10px] uppercase font-bold tracking-widest">Avg Rating</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form (offset from fixed left panel) */}
      <div className="min-h-screen flex flex-col lg:ml-[50%] xl:ml-[55%] relative">
        {/* Header with Sign Up button - Absolute to allow perfect centering of form */}
        <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8 z-50">
          <Button
            variant="outline"
            onClick={() => navigate("/register")}
            className="rounded-full px-6 border-border/60 hover:bg-accent/50 transition-all font-bold"
          >
            Sign up
          </Button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10">
          <div className="w-full max-w-md space-y-4 lg:space-y-8">
            {/* Mobile Branding */}
            <div className="lg:hidden flex flex-col items-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-2"
              >
                <Zap className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Practice Koro</h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">#1 Mock Test Platform</p>
            </div>

            {/* Welcome Text */}
            <div className="space-y-0.5 text-center lg:text-left lg:space-y-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your details to access your account
              </p>
            </div>

            {/* Login Method Tabs */}
            <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "email" | "whatsapp")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 lg:h-12 bg-muted/60 rounded-xl p-1 mb-4 lg:mb-8">
                <TabsTrigger
                  value="whatsapp"
                  className="flex items-center gap-2 h-8 lg:h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs lg:text-sm"
                >
                  <Phone className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="flex items-center gap-2 h-8 lg:h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs lg:text-sm"
                >
                  <Mail className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Email
                </TabsTrigger>
              </TabsList>

              {/* Email Login Form */}
              <TabsContent value="email" className="mt-0 space-y-3 lg:space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-1.5 lg:space-y-2">
                    <Label htmlFor="email" className="text-[11px] lg:text-sm font-medium text-muted-foreground">
                      Email address
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail className="w-5 h-5" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        autoComplete="email"
                        className={`h-14 pl-12 pr-10 bg-muted/40 border-border/40 rounded-xl focus:bg-background transition-all text-base ${!emailValidation.valid ? 'border-red-500 focus:border-red-500' : ''}`}
                        value={emailFormData.email}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email: e.target.value })}
                        onBlur={() => setTouched({ ...touched, email: true })}
                      />
                      {touched.email && emailFormData.email && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {emailValidation.valid ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {!emailValidation.valid && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {emailValidation.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5 lg:space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[11px] lg:text-sm font-medium text-muted-foreground">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-[11px] lg:text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="w-5 h-5" />
                      </div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-14 pl-12 pr-12 bg-muted/40 border-border/40 rounded-xl focus:bg-background transition-all text-base"
                        value={emailFormData.password}
                        onChange={(e) => setEmailFormData({ ...emailFormData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {emailFormData.password && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength.level >= 1 ? passwordStrength.color : 'bg-gray-200'}`} />
                          <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength.level >= 2 ? passwordStrength.color : 'bg-gray-200'}`} />
                          <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrength.level >= 3 ? passwordStrength.color : 'bg-gray-200'}`} />
                        </div>
                        <p className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                          {passwordStrength.label} password
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* WhatsApp Login Form */}
              <TabsContent value="whatsapp" className="mt-0">
                <form onSubmit={handleWhatsAppLogin} className="space-y-5">
                  {/* WhatsApp Number Field */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber" className="text-sm font-medium text-muted-foreground">
                      WhatsApp Number
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Phone className="w-5 h-5" />
                      </div>
                      <Input
                        id="whatsappNumber"
                        type="tel"
                        required
                        placeholder="10-digit number"
                        maxLength={10}
                        className="h-14 pl-12 pr-4 bg-muted/40 border-border/40 rounded-xl focus:bg-background transition-all text-base"
                        value={whatsappFormData.whatsappNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setWhatsappFormData({ ...whatsappFormData, whatsappNumber: value });
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Enter without country code</p>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsappPassword" className="text-sm font-medium text-muted-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="w-5 h-5" />
                      </div>
                      <Input
                        id="whatsappPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-14 pl-12 pr-12 bg-muted/40 border-border/40 rounded-xl focus:bg-background transition-all text-base"
                        value={whatsappFormData.password}
                        onChange={(e) => setWhatsappFormData({ ...whatsappFormData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {whatsappFormData.password && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          <div className={`h-1 flex-1 rounded-full transition-all ${whatsappPasswordStrength.level >= 1 ? whatsappPasswordStrength.color : 'bg-gray-200'}`} />
                          <div className={`h-1 flex-1 rounded-full transition-all ${whatsappPasswordStrength.level >= 2 ? whatsappPasswordStrength.color : 'bg-gray-200'}`} />
                          <div className={`h-1 flex-1 rounded-full transition-all ${whatsappPasswordStrength.level >= 3 ? whatsappPasswordStrength.color : 'bg-gray-200'}`} />
                        </div>
                        <p className={`text-xs font-medium ${whatsappPasswordStrength.color.replace('bg-', 'text-')}`}>
                          {whatsappPasswordStrength.label} password
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="remember-whatsapp"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Label htmlFor="remember-whatsapp" className="text-sm text-muted-foreground cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f8fafc] px-2 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 text-base font-semibold rounded-xl border-border/60 hover:bg-white hover:text-emerald-600 hover:border-emerald-500/50 shadow-sm transition-all flex items-center justify-center gap-3 bg-white"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  Google
                </>
              )}
            </Button>

            {/* Register Link (Mobile) */}
            <p className="text-center text-sm text-muted-foreground lg:hidden">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
