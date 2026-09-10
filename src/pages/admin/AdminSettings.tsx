import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, UserCheck, Shield, UserPlus, Check, X, Clock, ArrowRight, Coins, Sparkles, UserCog } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import { logAdminAction } from "@/lib/adminAudit";

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
    const [requestToReject, setRequestToReject] = useState<AdminRequest | null>(null);

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
                            newSettings.yearly_subscription_fee = parseFloat(item.value ?? "") || 0;
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

            await logAdminAction({
                action: "approve_admin_request",
                tableName: "admin_requests",
                recordId: request.id,
                newData: { email: request.email },
            });
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
        setRequestToReject(null);
        setProcessingRequest(request.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            await (supabase
                .from("admin_requests" as any)
                .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
                .eq("id", request.id) as any);

            await logAdminAction({
                action: "reject_admin_request",
                tableName: "admin_requests",
                recordId: request.id,
                newData: { email: request.email },
            });
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

            await logAdminAction({
                action: "update_site_settings",
                tableName: "site_settings",
                newData: { ...settings },
            });
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
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-600 font-medium text-sm">Loading system settings...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Admin Settings" subtitle="Configure system-wide settings">
            <div className="max-w-3xl mx-auto space-y-6 pb-12">
                {/* Executive Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">System & Governance Settings</h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Configure monetization pricing, access control, and user approval workflows</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
                            System Control
                        </Badge>
                    </div>
                </div>

                {/* Admin Profile Card */}
                {adminProfile && (
                    <Card className="border border-slate-200/90 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-2xl sm:rounded-3xl shadow-md text-white overflow-hidden">
                        <CardHeader className="border-b border-white/10 pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-white text-base font-bold">
                                    <Shield className="w-4 h-4 text-blue-400" />
                                    Active Administrator Credentials
                                </CardTitle>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-blue-300 border border-white/10">
                                    {adminProfile.role.replace('_', ' ')}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-xl font-black text-white shrink-0 shadow-inner">
                                    {adminProfile.full_name?.charAt(0)?.toUpperCase() || adminProfile.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-white truncate">
                                        {adminProfile.full_name || "Admin User"}
                                    </p>
                                    <p className="text-blue-200/80 text-xs truncate">
                                        {adminProfile.email}
                                    </p>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs text-blue-200/90">
                                {adminProfile.role === "super_admin"
                                    ? "• Super Administrator: Unrestricted privileges over system settings, admin approvals, monetization, and content."
                                    : "• Administrator: Standard administrative access across question bank, students, tests, and announcements."}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pending Admin Requests */}
                <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                                <UserPlus className="w-4 h-4 text-blue-600" />
                                Pending Admin Access Requests
                                {adminRequests.length > 0 && (
                                    <Badge className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {adminRequests.length}
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Review and approve admin access requests from Google login users
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {adminRequests.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs sm:text-sm font-medium">No pending admin authorization requests</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {adminRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                {request.full_name?.charAt(0)?.toUpperCase() || request.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">
                                                    {request.full_name || "Unknown User"}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">{request.email}</p>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    Requested {new Date(request.requested_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setRequestToReject(request)}
                                                disabled={processingRequest === request.id}
                                                className="rounded-xl h-9 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 text-xs font-semibold"
                                            >
                                                {processingRequest === request.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <X className="w-3.5 h-3.5 mr-1" />
                                                        Reject
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleApproveRequest(request)}
                                                disabled={processingRequest === request.id}
                                                className="rounded-xl h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                                            >
                                                {processingRequest === request.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 mr-1" />
                                                        Grant Admin
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
                <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                            <Coins className="w-4 h-4 text-blue-600" />
                            Monetization & Subscription Settings
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Configure site-wide membership pricing for paid mock tests and courses
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subscription_fee" className="text-xs font-bold text-slate-700">Yearly Subscription Fee (INR ₹)</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                                <Input
                                    id="subscription_fee"
                                    type="number"
                                    value={settings.yearly_subscription_fee}
                                    onChange={(e) => setSettings({ ...settings, yearly_subscription_fee: parseFloat(e.target.value) || 0 })}
                                    className="h-12 pl-9 rounded-2xl border-slate-200 bg-white focus-visible:ring-blue-600 font-black text-lg shadow-2xs"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Students who purchase this plan unlock all items marked as "Paid" for 1 whole year.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Student Approval Settings */}
                <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                            Student Registration Workflow
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            Configure how new candidate accounts are verified and admitted
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        {/* Auto Approve Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/40 border border-blue-100/80">
                            <div className="space-y-1 pr-4">
                                <Label htmlFor="auto_approve" className="text-sm font-bold text-slate-900 cursor-pointer">
                                    Auto Approve Students
                                </Label>
                                <p className="text-xs text-slate-500">
                                    When enabled, new students will be automatically granted active access upon registration without manual moderation.
                                </p>
                            </div>
                            <Switch
                                id="auto_approve"
                                checked={settings.auto_approve_students}
                                onCheckedChange={(checked) =>
                                    setSettings({ ...settings, auto_approve_students: checked })
                                }
                                className="data-[state=checked]:bg-blue-600"
                            />
                        </div>

                        {/* Informational Alert Box */}
                        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                            <div className="flex items-start gap-3">
                                <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-900">Manual Approval Protocol</p>
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        When auto-approve is turned off, candidates register with a <strong className="font-bold">Pending</strong> status and will require explicit one-click approval from the <strong className="font-bold">Student Management</strong> tab before taking exams.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold text-white shadow-md shadow-blue-500/20 text-sm transition-all"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving System Configuration...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save System Configuration
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            Connected Administrative Tools
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <a
                            href="/admin/ai-settings"
                            className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">AI & OpenRouter Configuration</p>
                                    <p className="text-xs text-slate-400">Configure LLM models, API keys, and prompt parameters</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </a>
                    </CardContent>
                </Card>
            </div>
            <DeleteAlertDialog
                isOpen={!!requestToReject}
                onClose={() => setRequestToReject(null)}
                onConfirm={() => requestToReject && handleRejectRequest(requestToReject)}
                title="Reject admin request"
                description={
                    <>
                        Reject <span className="font-bold text-slate-900">{requestToReject?.email}</span>? They will not receive admin access.
                    </>
                }
                confirmText="Reject request"
                isDeleting={!!requestToReject && processingRequest === requestToReject.id}
            />
        </AdminLayout>
    );
};

export default AdminSettings;
