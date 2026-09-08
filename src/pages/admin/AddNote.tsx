import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen, Save, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
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
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-gray-500 font-medium">Preparing your workspace...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title={editId ? "Edit Article" : "Create Article"}
            subtitle={editId ? "Updating your educational content" : "Publishing a new study guide"}
            headerActions={BackButton}
        >
            <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
                <Card className="border-0 shadow-xl shadow-gray-200/50 bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black text-gray-800">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <NotebookPen className="w-5 h-5 text-violet-600" />
                            </div>
                            {editId ? "Update Educational Article" : "New Educational Article"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Core Subject</Label>
                                    <Select
                                        value={formData.subject_id}
                                        onValueChange={(value) => setFormData({ ...formData, subject_id: value, topic_id: "" })}
                                    >
                                        <SelectTrigger className="rounded-2xl h-14 border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-violet-500/20 transition-all shadow-sm">
                                            <SelectValue placeholder="Which subject is this for?" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {subjects.map((subject) => (
                                                <SelectItem key={subject.id} value={subject.id} className="rounded-xl my-1 focus:bg-violet-50">
                                                    {subject.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Topic</Label>
                                    <Select
                                        value={formData.topic_id}
                                        onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
                                        disabled={!formData.subject_id}
                                    >
                                        <SelectTrigger className="rounded-2xl h-14 border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-violet-500/20 transition-all shadow-sm">
                                            <SelectValue placeholder={formData.subject_id ? "Select a topic" : "Select a subject first"} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {filteredTopics.map((topic) => (
                                                <SelectItem key={topic.id} value={topic.id} className="rounded-xl my-1 focus:bg-violet-50">
                                                    {topic.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Article Headline</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Enter a catchy title for your article..."
                                    className="h-14 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-violet-500/20 transition-all font-bold text-lg shadow-sm"
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 p-2">
                                    <Checkbox
                                        id="is_paid"
                                        checked={formData.is_paid}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked as boolean })}
                                        className="w-6 h-6 rounded-lg border-violet-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="is_paid" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Premium Content
                                        </Label>
                                        <p className="text-xs text-gray-500">Enable this to make this article require a premium subscription</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <Label className="text-sm font-bold text-gray-700">Article Content</Label>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Supports Rich Text (Upcoming)</span>
                                </div>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Start writing your educational masterpiece here..."
                                    rows={18}
                                    className="rounded-3xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-violet-500/20 transition-all leading-relaxed shadow-sm p-6 text-gray-700 resize-none"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button variant="ghost" onClick={handleReset} className="rounded-2xl h-14 flex-1 text-gray-500 font-bold hover:bg-gray-100">
                                    <RefreshCw className="w-5 h-5 mr-2" />
                                    {editId ? "Restore Original" : "Reset Draft"}
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 h-14 flex-[2] shadow-xl shadow-indigo-500/20 text-white font-black text-lg transition-all active:scale-95"
                                >
                                    {saving ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
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
