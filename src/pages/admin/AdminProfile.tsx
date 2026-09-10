import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, User, ShieldCheck, KeyRound, Mail, Calendar, BadgeCheck, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminLayout from "@/components/admin/AdminLayout";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

const AdminProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!error && data) {
      setProfile({
        id: data.id,
        email: data.email ?? "",
        full_name: data.full_name ?? null,
        created_at: data.created_at,
      });
      setFullName(data.full_name || "");
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/admin/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
      localStorage.clear();
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges",
        variant: "destructive",
      });
      navigate("/admin/login");
      return;
    }

    await loadProfile();
    setLoading(false);
  }, [navigate, toast, loadProfile]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleUpdateProfile = async () => {
    if (!profile) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Profile updated successfully",
    });

    await loadProfile();
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Password changed successfully",
    });

    setNewPassword("");
    setConfirmPassword("");
  };

  if (loading) {
    return (
      <AdminLayout title="Admin Profile" subtitle="Manage your account">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Loading administrator profile...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your account">
      <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-12">
        {/* Executive Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Admin Profile & Security</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Manage credentials, display name, and system credentials</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
              Verified Administrator
            </Badge>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Personal Information</CardTitle>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Admin Account</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* User Hero Banner */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 shadow-2xs border-2 border-white shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl sm:text-2xl font-black">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 truncate">{profile?.full_name || "Admin"}</h3>
                    <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{profile?.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                      Administrator
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-bold text-slate-700">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-11 rounded-2xl border-slate-200 text-sm shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Address (Read-only)
                </Label>
                <Input value={profile?.email || ""} disabled className="h-11 rounded-2xl bg-slate-50 border-slate-200 text-sm text-slate-500 shadow-2xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Registered On
                </Label>
                <Input
                  value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : ""}
                  disabled
                  className="h-11 rounded-2xl bg-slate-50 border-slate-200 text-sm text-slate-500 shadow-2xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving Changes..." : "Update Profile"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Change Password</CardTitle>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Security</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password" className="text-xs font-bold text-slate-700">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="h-11 rounded-2xl border-slate-200 text-sm shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-11 rounded-2xl border-slate-200 text-sm shadow-2xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={saving || !newPassword}
                  className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {saving ? "Updating Password..." : "Change Password"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
