import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, Sparkles, Key, Cpu, Eye, EyeOff, ExternalLink, ShieldCheck } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

const AIConfigSettings = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [settings, setSettings] = useState({
        openrouter_api_key: "",
        openrouter_model: "meta-llama/llama-3.3-70b-instruct:free",
    });

    const fetchUserRole = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { data } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .maybeSingle();
            setUserRole(data?.role || null);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("site_settings")
                .select("key, value");

            if (error) throw error;

            if (data) {
                setSettings(prev => {
                    const newSettings = { ...prev };
                    data.forEach((item) => {
                        if (item.key === "openrouter_api_key") newSettings.openrouter_api_key = item.value || "";
                        if (item.key === "openrouter_model") newSettings.openrouter_model = item.value || "";
                    });
                    return newSettings;
                });
            }
        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            console.error("Error fetching settings:", error);
            // Don't show toast on load failure if it's just missing table (first run)
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
        const init = async () => {
            await fetchUserRole();
            fetchSettings();
        };
        init();
    }, [fetchUserRole, fetchSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: "openrouter_api_key", value: settings.openrouter_api_key, updated_at: new Date().toISOString() },
                { key: "openrouter_model", value: settings.openrouter_model, updated_at: new Date().toISOString() },
            ];

            // Use upsert with onConflict to properly handle existing keys
            for (const update of updates) {
                const { error } = await supabase
                    .from("site_settings")
                    .upsert(update, { onConflict: 'key' });

                if (error) {
                    console.error(`Error saving ${update.key}:`, error);
                    throw error;
                }
            }

            toast({
                title: "Success",
                description: "AI settings saved successfully",
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
            <AdminLayout title="AI Settings">
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-600 font-medium text-sm">Loading AI settings...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const MODEL_PRESETS = [
        { label: "Llama 3.3 70B (Free)", id: "meta-llama/llama-3.3-70b-instruct:free" },
        { label: "Gemini 2.0 Flash (Free)", id: "google/gemini-2.0-flash-exp:free" },
        { label: "DeepSeek Chat", id: "deepseek/deepseek-chat" },
        { label: "Mistral 7B (Free)", id: "mistralai/mistral-7b-instruct:free" },
    ];

    return (
        <AdminLayout title="AI Settings" subtitle="Configure OpenRouter and AI models">
            <div className="max-w-3xl mx-auto space-y-6 pb-12">
                {/* Executive Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">AI & OpenRouter Configuration</h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Connect OpenRouter credentials and automated question generation models</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
                            AI Engine
                        </Badge>
                    </div>
                </div>

                {/* Configuration Card */}
                <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
                                <Key className="w-4 h-4 text-blue-600" />
                                OpenRouter API Key & Authentication
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Your API key is stored securely in site settings and used by server functions
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="api_key" className="text-xs font-bold text-slate-700">OpenRouter API Key</Label>
                                <a
                                    href="https://openrouter.ai/keys"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                                >
                                    Get key from OpenRouter
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="relative">
                                <Input
                                    id="api_key"
                                    type={showKey ? "text" : "password"}
                                    value={settings.openrouter_api_key}
                                    onChange={(e) => setSettings({ ...settings, openrouter_api_key: e.target.value })}
                                    placeholder="sk-or-v1-..."
                                    className="h-11 pl-4 pr-11 rounded-2xl border-slate-200 bg-white font-mono text-xs sm:text-sm shadow-2xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Key starts with <code className="font-mono text-slate-600">sk-or-v1-</code>.
                            </p>
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="model" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                                Selected AI Model ID
                            </Label>
                            <Input
                                id="model"
                                value={settings.openrouter_model}
                                onChange={(e) => setSettings({ ...settings, openrouter_model: e.target.value })}
                                placeholder="meta-llama/llama-3.3-70b-instruct:free"
                                className="h-11 rounded-2xl border-slate-200 bg-white font-mono text-xs sm:text-sm shadow-2xs"
                            />
                            
                            {/* Preset Model Pills */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Recommended Presets:</span>
                                <div className="flex flex-wrap gap-2">
                                    {MODEL_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => setSettings({ ...settings, openrouter_model: preset.id })}
                                            className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                                                settings.openrouter_model === preset.id
                                                    ? "bg-blue-50 border-blue-300 text-blue-700 font-bold"
                                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving AI Configuration...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save AI Configuration
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Diagnostic Help */}
                        <div className="mt-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                    Access Permission Diagnostic
                                </p>
                                <Badge variant="secondary" className="text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                                    Role: {userRole || 'Loading...'}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Requires an admin or super_admin account to persist global settings to Supabase. If you encounter permission errors, verify your Supabase RLS policies on <code className="text-blue-600 font-mono">site_settings</code>.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AIConfigSettings;
