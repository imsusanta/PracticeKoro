import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen, Save, RefreshCw, ArrowLeft, Loader2, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminLayout from "@/components/admin/AdminLayout";

interface Subject {
    id: string;
    name: string;
}

interface Topic {
    id: string;
    subject_id: string;
    name: string;
}

const AddNote = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("edit");
    
    // Quick Add parameters
    const prefillSubjectId = searchParams.get("subject_id") || "";
    const prefillTopicId = searchParams.get("topic_id") || "";
    const prefillTopicName = searchParams.get("topic_name") || "";

    const { toast } = useToast();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!editId);

    const [formData, setFormData] = useState({
        title: prefillTopicName,
        content: "",
        subject_id: prefillSubjectId,
        topic_id: prefillTopicId,
        is_paid: false,
        price: 0,
    });

    const loadSubjects = useCallback(async () => {
        // Order by order_index to match Subject Management order
        const { data } = await supabase.from("subjects").select("id, name, order_index").eq("category", "notes").order("order_index", { ascending: true, nullsFirst: false });
        if (data) setSubjects(data);
    }, []);

    const loadTopics = useCallback(async () => {
        const { data } = await supabase.from("topics").select("id, subject_id, name, order_index").eq("category", "notes").order("order_index", { ascending: true, nullsFirst: false });
        if (data) setTopics(data);
    }, []);

    const loadNoteData = useCallback(async (id: string) => {
        setInitialLoading(true);
        const { data, error } = await supabase
            .from("pdfs")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            console.error("Error loading note data:", error);
            toast({ title: "Error", description: `Failed to load note data: ${error?.message || "Unknown error"}`, variant: "destructive" });
            navigate("/admin/notes");
            return;
        }

        setFormData({
            title: data.title,
            content: data.content || "",
            subject_id: data.subject_id || "",
            topic_id: data.topic_id || "",
            is_paid: data.is_paid || false,
            price: data.price || 0,
        });
        setInitialLoading(false);
    }, [navigate, toast]);

    const checkAuth = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/admin/login"); return; }

        const { data: roleData } = await supabase
            .from("user_roles").select("role").eq("user_id", session.user.id).in("role", ["admin", "super_admin"]).maybeSingle();

        if (!roleData) {
            await supabase.auth.signOut();
            toast({ title: "Access Denied", description: "No admin privileges", variant: "destructive" });
            navigate("/admin/login");
            return;
        }

        await Promise.all([loadSubjects(), loadTopics()]);

        if (editId) {
            await loadNoteData(editId);
        }

        setLoading(false);
    }, [navigate, toast, loadSubjects, loadTopics, editId, loadNoteData]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (formData.subject_id) {
            setFilteredTopics(topics.filter(t => t.subject_id === formData.subject_id));
            // Only validate and reset topic_id if topics are actually loaded
            if (topics.length > 0) {
                setFormData(prev => {
                    if (prev.topic_id && !topics.some(t => t.subject_id === formData.subject_id && t.id === prev.topic_id)) {
                        return { ...prev, topic_id: "" };
                    }
                    return prev;
                });
            }
        } else {
            setFilteredTopics([]);
        }
    }, [formData.subject_id, topics]);

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.subject_id || !formData.topic_id) {
            toast({ title: "Error", description: "Title, Subject and Topic are required", variant: "destructive" });
            return;
        }
        setSaving(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const payload = {
            title: formData.title,
            content: formData.content || null,
            subject_id: formData.subject_id || null,
            topic_id: formData.topic_id || null,
            exam_id: null,
            is_paid: formData.is_paid,
            uploaded_by: session.user.id,
        };

        let error;
        if (editId) {
            const { error: updateError } = await supabase.from("pdfs").update(payload).eq("id", editId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from("pdfs").insert([payload]);
            error = insertError;
        }

        setSaving(false);

        if (error) {
            console.error("Error saving note:", error);
            toast({ 
                title: "Error", 
                description: `${editId ? "Failed to update note" : "Failed to add note"}: ${error.message || "Unknown error"}`, 
                variant: "destructive" 
            });
            return;
        }

        toast({ title: "Success", description: editId ? "Note updated successfully" : "Note added successfully" });
        navigate("/admin/notes");
    };

    const handleReset = () => {
        if (editId) {
            loadNoteData(editId);
        } else {
            setFormData({ title: "", content: "", subject_id: "", topic_id: "", is_paid: false, price: 0 });
        }
    };

    const BackButton = (
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/notes")} className="w-10 h-10 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
        </Button>
    );

    if (loading || initialLoading) {
        return (
            <AdminLayout title={editId ? "Edit Note" : "Add Note"} subtitle="Organizing your articles" headerActions={BackButton}>
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-600 font-medium text-sm">Preparing article workspace...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title={editId ? "Edit Article" : "Create Article"}
            subtitle={editId ? "Updating educational content" : "Publishing a new study guide"}
            headerActions={BackButton}
        >
            <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
                {/* Executive Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            <NotebookPen className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    {editId ? "Edit Study Article" : "Create Study Article"}
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                {editId ? "Update lesson content and syllabus structure" : "Author comprehensive notes and study material for candidates"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
                            {editId ? "Editing Article" : "New Article Draft"}
                        </Badge>
                    </div>
                </div>

                {/* Main Article Editor Card */}
                <Card className="border border-slate-200/90 bg-white rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">Article Content & Details</CardTitle>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">Study Notes Portal</span>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {/* Subject & Topic Selectors */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-slate-200/90">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Target Subject *</Label>
                                    <Select
                                        value={formData.subject_id}
                                        onValueChange={(value) => setFormData({ ...formData, subject_id: value, topic_id: "" })}
                                    >
                                        <SelectTrigger className="rounded-2xl h-11 border-slate-200 bg-white text-sm shadow-2xs">
                                            <SelectValue placeholder="Select Subject" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {subjects.map((subject) => (
                                                <SelectItem key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-700">Target Topic *</Label>
                                    <Select
                                        value={formData.topic_id}
                                        onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
                                        disabled={!formData.subject_id}
                                    >
                                        <SelectTrigger className="rounded-2xl h-11 border-slate-200 bg-white text-sm shadow-2xs">
                                            <SelectValue placeholder={formData.subject_id ? "Select Topic" : "Select subject first"} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {filteredTopics.map((topic) => (
                                                <SelectItem key={topic.id} value={topic.id}>
                                                    {topic.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Headline */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Article Headline / Title *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Enter descriptive article title..."
                                    className="h-11 rounded-2xl border-slate-200 bg-white font-bold text-sm sm:text-base shadow-2xs"
                                />
                            </div>

                            {/* Premium Toggle */}
                            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-blue-50/40 border border-blue-100/80">
                                <Checkbox
                                    id="is_paid"
                                    checked={formData.is_paid}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked as boolean })}
                                    className="w-5 h-5 rounded-lg border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <div className="grid gap-0.5 leading-none">
                                    <Label htmlFor="is_paid" className="text-xs font-bold text-slate-800 cursor-pointer">
                                        Premium Access Only
                                    </Label>
                                    <p className="text-[11px] text-slate-500">Require an active subscription plan to unlock and read this article</p>
                                </div>
                            </div>

                            {/* Content Textarea */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-700">Article Body Content *</Label>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Markdown & LaTeX Compatible</span>
                                </div>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Start drafting your comprehensive study notes..."
                                    rows={16}
                                    className="rounded-2xl border-slate-200 bg-slate-50/30 focus-visible:bg-white focus-visible:ring-blue-600 transition-all leading-relaxed shadow-inner p-4 text-slate-800 text-sm resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    onClick={handleReset}
                                    className="rounded-2xl h-11 px-5 text-slate-600 font-bold border-slate-200 hover:bg-slate-50 flex-1 sm:flex-none"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    {editId ? "Restore Original" : "Reset Draft"}
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={saving || !formData.title.trim() || !formData.content.trim()}
                                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 px-6 flex-[2] shadow-md shadow-blue-500/20 text-white font-bold text-sm transition-all"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            {editId ? "Commit Changes" : "Publish Article"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AddNote;
