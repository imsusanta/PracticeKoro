import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenState, setTokenState] = useState<"checking" | "invalid" | "valid">("checking");
  const [passwordReset, setPasswordReset] = useState(false);

  useEffect(() => {
    // Check if user came from password reset email
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTokenState("valid");
      } else {
        setTokenState("invalid");
      }
    });
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    // Add more validation rules as needed
    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setPasswordReset(true);
        toast.success("Password reset successfully!");

        // Sign out and redirect to login after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate("/login");
        }, 3000);
      }
    } catch (error: any) {
      toast.error("An error occurred. Please try again.");
      console.error("Password update error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (tokenState !== "valid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              {tokenState === "checking" ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-600">Verifying reset link...</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg text-slate-900">This reset link is invalid or expired</p>
                  <p className="text-sm text-gray-600 text-center">Request a new password reset email to continue.</p>
                  <Button type="button" onClick={() => navigate("/forgot-password")}>
                    Request a new link
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Password Reset Complete!</h3>
              <p className="text-sm text-gray-600 text-center">
                Your password has been successfully reset.
                <br />
                Redirecting to login page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 sm:h-12"
                  disabled={loading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={loading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <Alert>
              <AlertDescription className="text-sm">
                <p className="font-medium mb-2">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li className={newPassword.length >= 6 ? "text-green-600" : ""}>
                    At least 6 characters
                  </li>
                  <li className={newPassword === confirmPassword && newPassword !== "" ? "text-green-600" : ""}>
                    Passwords match
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
