import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
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
      setProfile(data);
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
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
      ["practicekoro_admin_remember_email"].forEach((key) => localStorage.removeItem(key));
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

    setProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);

    setProfileSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Profile saved",
      description: "Your name was updated.",
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

    setPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password changed",
      description: "Use your new password next time you sign in.",
    });

    setNewPassword("");
    setConfirmPassword("");
  };

  if (loading) {
    return (
      <AdminLayout title="Admin Profile" subtitle="Manage your account">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-700 font-medium">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your account">
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{profile?.full_name || "Admin"}</h3>
                  <p className="text-sm text-gray-500">{profile?.email}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="admin_email" className="text-sm font-medium">Email (read-only)</Label>
                <Input id="admin_email" value={profile?.email || ""} disabled className="rounded-xl bg-gray-50" />
              </div>

              <div>
                <Label htmlFor="admin_member_since" className="text-sm font-medium">Member Since</Label>
                <Input
                  id="admin_member_since"
                  value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}
                  disabled
                  className="rounded-xl bg-gray-50"
                />
              </div>

              <Button onClick={handleUpdateProfile} disabled={profileSaving} className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 h-12">
                <Save className="w-4 h-4 mr-2" />
                {profileSaving ? "Saving..." : "Update Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new_password" className="text-sm font-medium">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password" className="text-sm font-medium">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rounded-xl"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={passwordSaving} className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 h-12">
                <Lock className="w-4 h-4 mr-2" />
                {passwordSaving ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
