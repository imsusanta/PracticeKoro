import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
      }
    } catch (error: any) {
      toast.error("An error occurred. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="gap-1 px-1 sm:px-3">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <CardDescription>
            {emailSent
              ? "Check your email for reset instructions"
              : "Enter your email address and we'll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>

        {!emailSent ? (
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  A password reset link will be sent to your email address. The link will expire in 1 hour.
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Remember your password?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Email Sent!</h3>
                <p className="text-sm text-gray-600">
                  We've sent a password reset link to:
                </p>
                <p className="font-medium text-blue-600">{email}</p>
              </div>

              <Alert className="mt-4">
                <AlertDescription className="text-sm space-y-2">
                  <p><strong>Next steps:</strong></p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Check your email inbox</li>
                    <li>Click the password reset link</li>
                    <li>Enter your new password</li>
                    <li>Sign in with your new password</li>
                  </ol>
                  <p className="mt-2 text-xs text-gray-500">
                    Didn't receive the email? Check your spam folder or{" "}
                    <button
                      type="button"
                      onClick={() => setEmailSent(false)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      try again
                    </button>
                    .
                  </p>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEmailSent(false)}
              >
                Send Another Email
              </Button>

              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
