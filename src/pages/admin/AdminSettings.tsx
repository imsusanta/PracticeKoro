import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, UserCheck, Shield, UserPlus, Check, X, Clock } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface AdminRequest {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    status: string;
    requested_at: string;
}

const AdminSettings = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
    const [processingRequest, setProcessingRequest] = useState<string | null>(null);
    const [adminProfile, setAdminProfile] = useState<{
        email: string;
        full_name: string | null;
        role: string;
    } | null>(null);
    const [settings, setSettings] = useState({
        auto_approve_students: false,
        yearly_subscription_fee: 0,
    });

    const fetchSettings = useCallback(async () => {
        try {
            // Fetch admin profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("full_name, email")
                    .eq("id", user.id)
                    .single();

                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .in("role", ["admin", "super_admin"])
                    .single();

                setAdminProfile({
                    email: user.email || profileData?.email || "Unknown",
                    full_name: profileData?.full_name || null,
                    role: roleData?.role || "admin",
                });
            }

            // Fetch site settings
            const { data, error } = await supabase
                .from("site_settings")
                .select("key, value")
                .in("key", ["auto_approve_students", "yearly_subscription_fee"]);

            if (error) throw error;

            if (data) {
                setSettings(prev => {
                    const newSettings = { ...prev };
                    data.forEach((item) => {
                        if (item.key === "auto_approve_students") {
                            newSettings.auto_approve_students = item.value === "true";
                        } else if (item.key === "yearly_subscription_fee") {
                            newSettings.yearly_subscription_fee = parseFloat(item.value) || 0;
                        }
                    });
                    return newSettings;
                });
            }

            // Fetch pending admin requests
            const { data: requests } = await (supabase
                .from("admin_requests" as any)
                .select("*")
                .eq("status", "pending")
                .order("requested_at", { ascending: false }) as any);

            if (requests) {
                setAdminRequests(requests);
            }
        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            console.error("Error fetching settings:", error);
            if (err.code !== '42P01') {
                toast({
                    title: "Error",
                    description: err.message || "Failed to load settings",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleApproveRequest = async (request: AdminRequest) => {
        setProcessingRequest(request.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // First create profile if not exists
            await (supabase
                .from("profiles")
                .insert({ id: request.user_id, email: request.email, full_name: request.full_name })
                .select()
                .single() as any);

            // Add admin role
            const { error: roleError } = await supabase
                .from("user_roles")
                .insert({ user_id: request.user_id, role: "admin" });

            if (roleError && !roleError.message.includes("duplicate")) {
                throw roleError;
            }

            // Update request status
            await (supabase
                .from("admin_requests" as any)
                .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
                .eq("id", request.id) as any);

            toast({
                title: "Request Approved",
                description: `${request.email} has been granted admin access.`,
            });

            // Refresh the list
            setAdminRequests(prev => prev.filter(r => r.id !== request.id));
        } catch (error) {
            console.error("Error approving request:", error);
            toast({
                title: "Error",
                description: "Failed to approve request.",
                variant: "destructive",
            });
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleRejectRequest = async (request: AdminRequest) => {
        setProcessingRequest(request.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase
                .from("admin_requests" as any)
                .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
                .eq("id", request.id) as any);

            toast({
                title: "Request Rejected",
                description: `${request.email}'s request has been rejected.`,
            });

            setAdminRequests(prev => prev.filter(r => r.id !== request.id));
        } catch (error) {
            console.error("Error rejecting request:", error);
            toast({
                title: "Error",
                description: "Failed to reject request.",
                variant: "destructive",
            });
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: "auto_approve_students", value: settings.auto_approve_students ? "true" : "false" },
                { key: "yearly_subscription_fee", value: settings.yearly_subscription_fee.toString() },
            ];

            const { error } = await supabase.from("site_settings").upsert(updates, { onConflict: 'key' });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Settings saved successfully",
            });
        } catch (error: unknown) {
            const err = error as { message?: string; code?: string };
            console.error("Error saving settings:", error);

            // Check for RLS policy violation
            if (err.code === '42501' || err.message?.includes('policy')) {
                toast({
                    title: "Permission Denied",
                    description: "You need admin or super_admin role to save settings. Please run the latest SQL migration in your Supabase dashboard.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: err.message || "Failed to save settings",
                    variant: "destructive",
                });
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout title="Admin Settings">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Admin Settings" subtitle="Configure system-wide settings">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Admin Profile Card */}
                {adminProfile && (
                    <Card className="border-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Shield className="w-5 h-5" />
                                Admin Profile
                            </CardTitle>
                            <CardDescription className="text-indigo-100">
                                Your administrator account details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                    {adminProfile.full_name?.charAt(0)?.toUpperCase() || adminProfile.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-semibold">
                                        {adminProfile.full_name || "Admin User"}
                                    </p>
                                    <p className="text-indigo-200 text-sm">
                                        {adminProfile.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-white/20">
                                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium uppercase tracking-wide">
                                    {adminProfile.role.replace('_', ' ')}
                                </span>
                                <span className="text-indigo-200 text-xs">
                                    • Full administrative access
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Admin Requests */}
                <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-amber-600" />
                            Pending Admin Requests
                            {adminRequests.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                    {adminRequests.length}
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Review and approve admin access requests from Google login users
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {adminRequests.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No pending admin requests</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {adminRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {request.full_name?.charAt(0)?.toUpperCase() || request.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {request.full_name || "Unknown User"}
                                                </p>
                                                <p className="text-sm text-gray-500">{request.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                aria-label="Reject request"
                                                onClick={() => handleRejectRequest(request)}
                                                disabled={processingRequest === request.id}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {processingRequest === request.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <X className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleApproveRequest(request)}
                                                disabled={processingRequest === request.id}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                            >
                                                {processingRequest === request.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Approve
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Subscription Settings */}
                <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Monetization Settings
                        </CardTitle>
                        <CardDescription>
                            Configure site-wide subscription pricing
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="subscription_fee" className="text-sm font-bold text-gray-700 ml-1">Yearly Subscription Fee (INR)</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                <Input
                                    id="subscription_fee"
                                    type="number"
                                    value={settings.yearly_subscription_fee}
                                    onChange={(e) => setSettings({ ...settings, yearly_subscription_fee: parseFloat(e.target.value) || 0 })}
                                    className="h-14 pl-8 rounded-2xl border-gray-200 bg-white focus:ring-violet-500/20 transition-all font-bold shadow-sm"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-gray-500 ml-1">This fee unlocks all content marked as "Paid" for 1 year.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Student Approval Settings */}
                <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                            Student Approval Settings
                        </CardTitle>
                        <CardDescription>
                            Configure how new student registrations are handled
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Auto Approve Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                            <div className="space-y-1">
                                <Label htmlFor="auto_approve" className="text-base font-medium text-gray-900">
                                    Auto Approve Students
                                </Label>
                                <p className="text-sm text-gray-500">
                                    When enabled, new students will be automatically approved upon registration.
                                    No manual approval required.
                                </p>
                            </div>
                            <Switch
                                id="auto_approve"
                                checked={settings.auto_approve_students}
                                onCheckedChange={(checked) =>
                                    setSettings({ ...settings, auto_approve_students: checked })
                                }
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        </div>

                        {/* Info Box */}
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-amber-800">Important Note</p>
                                    <p className="text-xs text-amber-700">
                                        When auto-approve is disabled, new students will have "pending" status
                                        and will need manual approval from the Student Management page before
                                        they can access tests and exams.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-semibold shadow-lg shadow-emerald-200/50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="border-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Settings className="w-4 h-4 text-gray-500" />
                            Other Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <a
                            href="/admin/ai-settings"
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">AI & OpenRouter Settings</span>
                            <span className="text-xs text-gray-400">→</span>
                        </a>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminSettings;
