import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Save, ArrowLeft, Loader2, X, ImagePlus, Type, FileText, Tag, Eye, EyeOff, Sparkles, Wand2, RefreshCw,
    Bold, Italic, Underline, List, ListOrdered, Link2, Code, Quote, Heading1, Heading2, Heading3, Smile
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";

const CATEGORIES = [
    { value: "Recruitment", label: "Recruitment", color: "from-blue-500 to-cyan-500" },
    { value: "Strategy", label: "Strategy", color: "from-purple-500 to-pink-500" },
    { value: "Syllabus", label: "Syllabus", color: "from-amber-500 to-orange-500" },
    { value: "Current Affairs", label: "Current Affairs", color: "from-rose-500 to-red-500" },
    { value: "Study Tips", label: "Study Tips", color: "from-emerald-500 to-teal-500" },
    { value: "Notifications", label: "Notifications", color: "from-indigo-500 to-violet-500" },
    { value: "General Knowledge", label: "General Knowledge", color: "from-slate-500 to-gray-500" }
];

const AddBlog = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("edit");
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!editId);

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category: "General Knowledge",
        is_published: false,
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [lastFocusedEditor, setLastFocusedEditor] = useState<'content' | 'excerpt'>('content');
    const [hasSyncedContent, setHasSyncedContent] = useState(false);

    const excerptEditorRef = useRef<HTMLDivElement>(null);
    const contentEditorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && !initialLoading && !hasSyncedContent) {
            if (excerptEditorRef.current && formData.excerpt) {
                excerptEditorRef.current.innerHTML = formData.excerpt;
            }
            if (contentEditorRef.current && formData.content) {
                contentEditorRef.current.innerHTML = formData.content;
            }
            if (formData.excerpt || formData.content) {
                setHasSyncedContent(true);
            }
        }
    }, [loading, initialLoading, hasSyncedContent, formData.excerpt, formData.content]);

    // AI Generation States
    const [aiPrompt, setAiPrompt] = useState("");
    const [generatingTitle, setGeneratingTitle] = useState(false);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [generatingContent, setGeneratingContent] = useState(false);
    const [generatingSlug, setGeneratingSlug] = useState(false);
    const [generatingFull, setGeneratingFull] = useState(false);
    const [aiSettings, setAiSettings] = useState<{ apiKey: string; model: string } | null>(null);

    // Fetch AI settings
    useEffect(() => {
        const fetchAiSettings = async () => {
            const { data } = await supabase
                .from("site_settings")
                .select("key, value");

            if (data) {
                const rawKey = data.find(d => d.key === "openrouter_api_key")?.value || "";
                // Sanitize API key: trim whitespace/newlines and remove non-ASCII chars
                // This prevents 'non ISO-8859-1 code point' errors in fetch headers
                const sanitizedKey = rawKey.trim().replace(/[^\x20-\x7E]/g, '');
                const settings = {
                    apiKey: sanitizedKey,
                    model: data.find(d => d.key === "openrouter_model")?.value || "meta-llama/llama-3.3-70b-instruct:free"
                };
                setAiSettings(settings);
            }
        };
        fetchAiSettings();
    }, []);

    const generateWithAI = async (type: 'title' | 'summary' | 'content' | 'full', prompt: string) => {
        if (!aiSettings?.apiKey) {
            toast({
                title: "API Key Required",
                description: "Please configure OpenRouter API key in AI Settings first",
                variant: "destructive"
            });
            navigate("/admin/ai-settings");
            return;
        }

        const setGenerating = type === 'title' ? setGeneratingTitle :
            type === 'summary' ? setGeneratingSummary :
                type === 'full' ? setGeneratingFull :
                    setGeneratingContent;

        setGenerating(true);

        try {
            let systemPrompt = "";
            let userPrompt = prompt || formData.title || formData.category;

            switch (type) {
                case 'title':
                    systemPrompt = `You are a blog title writer for an INDIAN exam preparation platform called "Practice Koro" based in West Bengal, INDIA. 
Write blog titles in Bengali (বাংলা) for INDIAN government job exams like WBCS, WBPSC, WBP, SSC CGL, Railway RRB, Bank PO exams.
IMPORTANT: This is for INDIA (West Bengal), NOT Bangladesh. Do not mention Bangladesh exams.
Keep title under 60 characters. Only return the title, nothing else.`;
                    userPrompt = `Write a Bengali blog title about: ${prompt || formData.category}\nTarget: Students in West Bengal, INDIA preparing for WBCS, SSC, Railway, Bank exams.`;
                    break;
                case 'summary':
                    systemPrompt = `Write a brief 2-sentence summary in Bengali (বাংলা) for a blog post about INDIAN government exams.
IMPORTANT: This is for INDIA (West Bengal), NOT Bangladesh. Focus on WBCS, WBPSC, SSC, Railway exams in India.
Only return the summary, nothing else.`;
                    userPrompt = `Write a Bengali summary for this blog: ${formData.title || prompt}\nTarget: INDIAN exam aspirants in West Bengal.`;
                    break;
                case 'full':
                    systemPrompt = `You are an expert SEO Content Writer for "Practice Koro", an INDIAN exam preparation platform based in West Bengal, INDIA.
Task: Write a complete SEO-friendly blog post package in Bengali (বাংলা).
The package must be returned as a JSON object with the following keys:
- "title": A catchy, SEO-optimized title (max 60 chars).
- "summary": A compelling 2-sentence summary/excerpt. 
- "content": A detailed article (600-1000 words) using ## for headings, bullet points, and high-relevance keywords for Indian aspirants.

CRITICAL CONTEXT:
- Targeted at Indian students in West Bengal. 
- Focus only on Indian exams: WBCS, WBPSC, WBP, SSC CGL/CHSL, Railway RRB, Bank PO/Clerk (IBPS, SBI).
- NO mentions of Bangladesh or its exams.
- Tone: Professional, authoritative, and helpful.

Return ONLY the JSON object.`;
                    userPrompt = `Generate a full SEO-optimized Bengali blog post about this topic: ${prompt || formData.title || formData.category}`;
                    break;
                case 'content':
                    systemPrompt = `You are a content writer for "Practice Koro", an INDIAN exam preparation platform based in West Bengal, INDIA.
Write blog articles in Bengali (বাংলা) about INDIAN government job exams.

CRITICAL: This is for INDIA (West Bengal state), NOT Bangladesh. 
Focus on these INDIAN exams only:
- WBCS (West Bengal Civil Service)
- WBPSC (West Bengal Public Service Commission)
- WBP (West Bengal Police)
- SSC CGL/CHSL (Staff Selection Commission, India)
- Railway RRB (Indian Railways)
- Bank PO/Clerk (IBPS, SBI - Indian Banks)

Use ## for headings, bullet points, and practical tips. Write 500-800 words.
Only return the article content, nothing else.`;
                    userPrompt = `Write a complete Bengali blog article about: ${formData.title || prompt}\n\nTopic: ${formData.category}\nTarget audience: Students in West Bengal, INDIA preparing for government exams.\nDO NOT mention Bangladesh exams.`;
                    break;
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${aiSettings.apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Practice Koro Blog Writer"
                },
                body: JSON.stringify({
                    model: aiSettings.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: (type === 'content' || type === 'full') ? 2000 : 500
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || "API request failed");
            }

            const generatedText = data.choices?.[0]?.message?.content?.trim();
            if (!generatedText) {
                throw new Error("AI returned empty response");
            }

            if (type === 'full') {
                try {
                    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
                    const jsonData = JSON.parse(jsonMatch ? jsonMatch[0] : generatedText);
                    setFormData(prev => ({
                        ...prev,
                        title: jsonData.title || prev.title,
                        excerpt: jsonData.summary || prev.excerpt,
                        content: jsonData.content || prev.content
                    }));
                    if (jsonData.summary && excerptEditorRef.current) excerptEditorRef.current.innerHTML = jsonData.summary;
                    if (jsonData.content && contentEditorRef.current) contentEditorRef.current.innerHTML = jsonData.content;
                } catch (e) {
                    console.error("Failed to parse full blog JSON:", e);
                    setFormData(prev => ({ ...prev, content: generatedText }));
                    if (contentEditorRef.current) contentEditorRef.current.innerHTML = generatedText;
                }
            } else {
                switch (type) {
                    case 'title': setFormData(prev => ({ ...prev, title: generatedText })); break;
                    case 'summary':
                        setFormData(prev => ({ ...prev, excerpt: generatedText }));
                        if (excerptEditorRef.current) excerptEditorRef.current.innerHTML = generatedText;
                        break;
                    case 'content':
                        setFormData(prev => ({ ...prev, content: generatedText }));
                        if (contentEditorRef.current) contentEditorRef.current.innerHTML = generatedText;
                        break;
                }
            }

            toast({
                title: "Generated!",
                description: `${type.charAt(0).toUpperCase() + type.slice(1)} generated successfully`,
            });
        } catch (error) {
            console.error("AI generation error:", error);
            toast({
                title: "Generation Failed",
                description: error instanceof Error ? error.message : "Failed to generate content",
                variant: "destructive"
            });
        } finally {
            setGenerating(false);
        }
    };

    // Generate English slug from title (translates Bengali to English)
    const generateSlugWithAI = async () => {
        if (!formData.title.trim()) {
            toast({
                title: "Title Required",
                description: "Please enter a title first to generate URL slug",
                variant: "destructive"
            });
            return;
        }

        if (!aiSettings?.apiKey) {
            toast({
                title: "API Key Required",
                description: "Please configure OpenRouter API key in AI Settings first",
                variant: "destructive"
            });
            navigate("/admin/ai-settings");
            return;
        }

        setGeneratingSlug(true);

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${aiSettings.apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Practice Koro Slug Generator"
                },
                body: JSON.stringify({
                    model: aiSettings.model,
                    messages: [
                        {
                            role: "system",
                            content: `You are a URL slug generator. Your task is to:
1. Translate the given title to English if it's in Bengali or any other language
2. Create a SHORT, URL-friendly slug from the English translation
3. Use only lowercase letters, numbers, and hyphens
4. Keep it under 50 characters
5. Remove common words like 'the', 'a', 'an', 'for', 'of', 'in', 'to'
6. Focus on the main keywords

ONLY return the slug, nothing else. No explanation, no quotes, just the slug.

Examples:
- "ভারতীয় জাতীয় কংগ্রেস: প্রতিষ্ঠা ও প্রথম অধিবেশন" → "indian-national-congress-first-session"
- "WBCS পরীক্ষার প্রস্তুতি টিপস" → "wbcs-exam-preparation-tips"
- "রেলওয়ে গ্রুপ ডি সিলেবাস 2024" → "railway-group-d-syllabus-2024"`
                        },
                        { role: "user", content: `Generate URL slug for: ${formData.title}` }
                    ],
                    temperature: 0.3,
                    max_tokens: 100
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || "API request failed");
            }

            let generatedSlug = data.choices?.[0]?.message?.content?.trim() || "";

            // Clean up the slug - ensure it's URL safe
            generatedSlug = generatedSlug
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 100);

            if (generatedSlug) {
                setFormData(prev => ({ ...prev, slug: generatedSlug }));
                toast({
                    title: "Slug Generated!",
                    description: `URL: /${generatedSlug}`,
                });
            } else {
                throw new Error("Failed to generate slug");
            }

        } catch (error) {
            console.error("Slug generation error:", error);

            // Fallback: Generate basic slug from title (keeping only alphanumeric)
            const fallbackSlug = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 50) || `post-${Date.now()}`;

            setFormData(prev => ({ ...prev, slug: fallbackSlug }));

            toast({
                title: "AI Generation Failed",
                description: "Created fallback slug from title. You can edit it manually.",
                variant: "destructive"
            });
        } finally {
            setGeneratingSlug(false);
        }
    };

    // Formatting Handlers
    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    const insertLink = () => {
        const url = prompt("Enter the URL:");
        if (url) execCommand("createLink", url);
    };

    const insertEmoji = (emoji: string) => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(emoji);
            range.insertNode(textNode);
            // Move cursor after emoji
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);

            // Sync with formData based on last focused editor
            if (lastFocusedEditor === 'content') {
                if (contentEditorRef.current) setFormData(prev => ({ ...prev, content: contentEditorRef.current?.innerHTML || "" }));
            } else if (lastFocusedEditor === 'excerpt') {
                if (excerptEditorRef.current) setFormData(prev => ({ ...prev, excerpt: excerptEditorRef.current?.innerHTML || "" }));
            }
        }
    };

    const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

    const loadBlogData = useCallback(async (id: string) => {
        setInitialLoading(true);
        const { data, error } = await supabase
            .from("blog_posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            toast({ title: "Error", description: "Failed to load blog data", variant: "destructive" });
            navigate("/admin/blogs");
            return;
        }

        setFormData({
            title: data.title,
            slug: (data as any).slug || "",
            excerpt: data.excerpt || "",
            content: data.content || "",
            category: data.author || "General",
            is_published: data.is_published,
        });

        setHasSyncedContent(false);
        setImagePreview(data.image_url);
        setInitialLoading(false);
    }, [navigate, toast]);

    const checkAuth = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/admin/login"); return; }

        const { data: roleData } = await supabase
            .from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();

        if (!roleData) {
            await supabase.auth.signOut();
            toast({ title: "Access Denied", description: "No admin privileges", variant: "destructive" });
            navigate("/admin/login");
            return;
        }

        if (editId) {
            await loadBlogData(editId);
        }

        setLoading(false);
    }, [navigate, toast, editId, loadBlogData]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return imagePreview;

        setUploadingImage(true);
        try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { error } = await supabase.storage
                .from("blog-images")
                .upload(fileName, imageFile, { upsert: true });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from("blog-images")
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            toast({ title: "Error", description: "Title is required", variant: "destructive" });
            return;
        }

        setSaving(true);

        try {
            const imageUrl = await uploadImage();

            // Generate slug from title if not provided (English characters only)
            let generatedSlug = formData.slug.trim();
            if (!generatedSlug) {
                generatedSlug = formData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove non-English characters
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .replace(/-+/g, '-') // Replace multiple hyphens with single
                    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
                    .slice(0, 100);

                // If no English characters in title, generate a timestamp-based slug
                if (!generatedSlug) {
                    generatedSlug = `post-${Date.now()}`;
                }
            }

            const payload = {
                title: formData.title.trim(),
                slug: generatedSlug,
                excerpt: formData.excerpt.trim() || null,
                content: formData.content.trim() || null,
                image_url: imageUrl,
                author: formData.category,
                is_published: formData.is_published,
                updated_at: new Date().toISOString(),
            };

            let error;
            if (editId) {
                const { error: updateError } = await supabase
                    .from("blog_posts")
                    .update(payload)
                    .eq("id", editId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("blog_posts")
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: formData.is_published ? (editId ? "Blog updated" : "Blog published") : (editId ? "Draft saved" : "Draft created"),
                description: formData.is_published ? "Readers can see this post." : "This post is saved as a draft.",
            });
            navigate("/admin/blogs");
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: editId ? "Failed to update blog" : "Failed to publish blog", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const selectedCategory = CATEGORIES.find(c => c.value === formData.category) || CATEGORIES[6];

    const BackButton = (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/blogs")}
            className="w-10 h-10 rounded-xl hover:bg-white/50"
        >
            <ArrowLeft className="w-5 h-5" />
        </Button>
    );

    if (loading || initialLoading) {
        return (
            <AdminLayout title={editId ? "Edit Blog" : "Create Blog"} subtitle="Manage your blog content" headerActions={BackButton}>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
                        <Loader2 className="w-8 h-8 text-white absolute inset-0 m-auto animate-spin" />
                    </div>
                    <p className="text-gray-500 font-medium">Loading editor...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title={editId ? "Edit Post" : "New Post"}
            subtitle={editId ? "Make changes to your article" : "Create something amazing"}
            headerActions={BackButton}
        >
            <div className="max-w-6xl mx-auto pb-8">
                {/* AI Topic Input */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-[1px] rounded-2xl">
                        <div className="bg-white rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <Wand2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">AI Blog Writer</h3>
                                    <p className="text-xs text-gray-500">Enter a topic and let AI generate content for you</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Input
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g., WBCS exam preparation tips, SSC CGL syllabus 2024..."
                                    className="flex-1 h-12 rounded-xl border-gray-200 focus:border-violet-500"
                                />
                                <Button
                                    onClick={() => {
                                        if (aiPrompt) {
                                            generateWithAI('full', aiPrompt);
                                        }
                                    }}
                                    disabled={!aiPrompt || generatingFull}
                                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200"
                                >
                                    {generatingFull ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Write Complete Blog
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (aiPrompt) {
                                            generateWithAI('title', aiPrompt);
                                        }
                                    }}
                                    disabled={!aiPrompt || generatingTitle}
                                    variant="outline"
                                    className="h-12 px-6 rounded-xl border-violet-200 text-violet-600 hover:bg-violet-50"
                                >
                                    {generatingTitle ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4 mr-2" />
                                            Title Only
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Main Content - Left Column */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Cover Image Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group"
                        >
                            <div
                                className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${activeSection === 'image'
                                    ? 'ring-2 ring-violet-500 ring-offset-2'
                                    : 'hover:shadow-xl hover:shadow-violet-100'
                                    }`}
                                onFocus={() => setActiveSection('image')}
                                onBlur={() => setActiveSection(null)}
                            >
                                {imagePreview ? (
                                    <div className="relative aspect-[2/1] bg-gray-900">
                                        <img
                                            src={imagePreview}
                                            alt="Cover"
                                            className="w-full h-full object-cover opacity-90"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        <button
                                            type="button"
                                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl flex items-center justify-center text-gray-700 transition-all shadow-lg"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <label className="absolute bottom-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer transition-all shadow-lg">
                                            <ImagePlus className="w-4 h-4" />
                                            Change
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center aspect-[2/1] rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 bg-gradient-to-br from-gray-50 to-violet-50/30 hover:from-violet-50/50 hover:to-purple-50/50 cursor-pointer transition-all group/upload">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-200 group-hover/upload:scale-110 transition-transform">
                                            <ImagePlus className="w-10 h-10 text-white" />
                                        </div>
                                        <span className="text-lg font-bold text-gray-700 mb-1">Add Cover Image</span>
                                        <span className="text-sm text-gray-400">Click to upload a cover image</span>
                                        <span className="text-xs text-gray-300 mt-2">PNG, JPG, WebP up to 5MB</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                        </motion.div>

                        {/* Title Input */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div
                                className={`bg-white rounded-2xl p-1 transition-all duration-300 ${activeSection === 'title'
                                    ? 'ring-2 ring-violet-500 ring-offset-2 shadow-xl shadow-violet-100'
                                    : 'shadow-sm hover:shadow-lg'
                                    }`}
                            >
                                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                            <Type className="w-4 h-4 text-violet-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => generateWithAI('title', aiPrompt || formData.category)}
                                        disabled={generatingTitle}
                                        className="h-8 px-3 text-xs rounded-lg text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                    >
                                        {generatingTitle ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                <Wand2 className="w-3 h-3 mr-1" />
                                                AI Generate
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    onFocus={() => setActiveSection('title')}
                                    onBlur={() => setActiveSection(null)}
                                    placeholder="Write an attention-grabbing headline..."
                                    className="border-0 text-2xl font-bold h-16 px-4 focus-visible:ring-0 placeholder:text-gray-300"
                                />
                            </div>
                        </motion.div>

                        {/* URL Slug Input */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 }}
                        >
                            <div
                                className={`bg-white rounded-2xl p-4 transition-all duration-300 ${activeSection === 'slug'
                                    ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-xl shadow-emerald-100'
                                    : 'shadow-sm hover:shadow-lg'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">URL Slug</span>
                                        <span className="text-xs text-gray-400">(English - AI translates from Bengali)</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={generateSlugWithAI}
                                        disabled={generatingSlug || !formData.title}
                                        className="h-7 px-3 text-xs rounded-lg text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                    >
                                        {generatingSlug ? (
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-3 h-3 mr-1" />
                                        )}
                                        {generatingSlug ? 'Translating...' : 'AI Generate'}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">/</span>
                                    <Input
                                        value={formData.slug}
                                        onChange={(e) => {
                                            // Process pasted/typed text - convert to URL-friendly format
                                            const value = e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9-]/g, '-') // Replace non-English with hyphens
                                                .replace(/-+/g, '-') // Replace multiple hyphens with single
                                                .replace(/^-/, ''); // Remove leading hyphen
                                            setFormData({ ...formData, slug: value });
                                        }}
                                        onFocus={() => setActiveSection('slug')}
                                        onBlur={() => {
                                            setActiveSection(null);
                                            // Clean up trailing hyphen on blur
                                            if (formData.slug.endsWith('-')) {
                                                setFormData({ ...formData, slug: formData.slug.replace(/-$/, '') });
                                            }
                                        }}
                                        placeholder="english-url-slug"
                                        className="border-0 h-10 px-2 focus-visible:ring-0 placeholder:text-gray-300 font-mono text-sm"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Final URL: {window.location.origin}/{formData.slug || 'your-post-url'}
                                </p>
                                {!formData.slug && formData.title && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        ⚠️ Click "AI Generate" to create English slug from title
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        {/* Excerpt Input */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <div
                                className={`bg-white rounded-2xl p-1 transition-all duration-300 ${activeSection === 'excerpt'
                                    ? 'ring-2 ring-violet-500 ring-offset-2 shadow-xl shadow-violet-100'
                                    : 'shadow-sm hover:shadow-lg'
                                    }`}
                            >
                                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Summary</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => execCommand('bold')}
                                            className="h-7 w-7 p-0 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                                            title="Bold"
                                        >
                                            <Bold className="w-3.5 h-3.5" />
                                        </Button>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                    title="Emoji"
                                                >
                                                    <Smile className="w-3.5 h-3.5" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto z-[60]">
                                                {EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => insertEmoji(emoji)}
                                                        className="hover:bg-gray-100 p-1 rounded text-lg flex items-center justify-center"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => generateWithAI('summary', formData.title)}
                                        disabled={generatingSummary || !formData.title}
                                        className="h-8 px-3 text-xs rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    >
                                        {generatingSummary ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                <Wand2 className="w-3 h-3 mr-1" />
                                                AI Generate
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div
                                    ref={excerptEditorRef}
                                    id="excerpt-editor"
                                    contentEditable
                                    onInput={(e) => {
                                        setFormData(prev => ({ ...prev, excerpt: e.currentTarget.innerHTML }));
                                    }}
                                    className="min-h-[80px] outline-none px-4 py-3 placeholder:text-gray-300 text-gray-700 text-sm leading-relaxed"
                                    onFocus={() => {
                                        setActiveSection('excerpt');
                                        setLastFocusedEditor('excerpt');
                                    }}
                                    onBlur={() => setActiveSection(null)}
                                ></div>
                            </div>
                        </motion.div>

                        {/* Content Input */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div
                                className={`bg-white rounded-2xl p-1 transition-all duration-300 ${activeSection === 'content'
                                    ? 'ring-2 ring-violet-500 ring-offset-2 shadow-xl shadow-violet-100'
                                    : 'shadow-sm hover:shadow-lg'
                                    }`}
                            >
                                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => generateWithAI('content', formData.title)}
                                        disabled={generatingContent || !formData.title}
                                        className="h-8 px-3 text-xs rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    >
                                        {generatingContent ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                Writing...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-3 h-3 mr-1" />
                                                AI Write Article
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-100 rounded-t-xl">
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('bold')} className="h-8 w-8 p-0" title="Bold"><Bold className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('italic')} className="h-8 w-8 p-0" title="Italic"><Italic className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('underline')} className="h-8 w-8 p-0" title="Underline"><Underline className="w-4 h-4" /></Button>
                                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('formatBlock', 'H1')} className="h-8 w-8 p-0" title="Heading 1"><Heading1 className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('formatBlock', 'H2')} className="h-8 w-8 p-0" title="Heading 2"><Heading2 className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('formatBlock', 'H3')} className="h-8 w-8 p-0" title="Heading 3"><Heading3 className="w-4 h-4" /></Button>
                                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('insertUnorderedList')} className="h-8 w-8 p-0" title="Bullet List"><List className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('insertOrderedList')} className="h-8 w-8 p-0" title="Numbered List"><ListOrdered className="w-4 h-4" /></Button>
                                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />
                                    <Button size="sm" variant="ghost" onClick={insertLink} className="h-8 w-8 p-0" title="Insert Link"><Link2 className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('formatBlock', 'blockquote')} className="h-8 w-8 p-0" title="Quote"><Quote className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('formatBlock', 'pre')} className="h-8 w-8 p-0" title="Code Block"><Code className="w-4 h-4" /></Button>

                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Emoji"><Smile className="w-4 h-4" /></Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                                            {EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => insertEmoji(emoji)}
                                                    className="hover:bg-gray-100 p-1 rounded text-lg flex items-center justify-center"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </PopoverContent>
                                    </Popover>

                                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />
                                    <Button size="sm" variant="ghost" onClick={() => execCommand('removeFormat')} className="h-8 w-8 p-0" title="Clear Formatting"><RefreshCw className="w-3 h-3" /></Button>
                                </div>
                                <div
                                    ref={contentEditorRef}
                                    id="blog-editor"
                                    contentEditable
                                    className="min-h-[400px] outline-none px-4 py-4 prose prose-emerald max-w-none text-gray-700 leading-relaxed overflow-y-auto"
                                    onInput={(e) => {
                                        setFormData(prev => ({ ...prev, content: e.currentTarget.innerHTML }));
                                    }}
                                    onFocus={() => {
                                        setActiveSection('content');
                                        setLastFocusedEditor('content');
                                    }}
                                    onBlur={() => setActiveSection(null)}
                                ></div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar - Right Column */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Publish Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl shadow-sm overflow-hidden sticky top-4"
                        >
                            <div className={`h-1.5 bg-gradient-to-r ${selectedCategory.color}`} />
                            <div className="p-5 space-y-5">
                                {/* Category */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</span>
                                    </div>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem
                                                    key={cat.value}
                                                    value={cat.value}
                                                    className="rounded-lg my-0.5 font-medium"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${cat.color}`} />
                                                        {cat.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Publish Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-violet-50/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {formData.is_published ? (
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                <Eye className="w-5 h-5 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                                <EyeOff className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">
                                                {formData.is_published ? "Published" : "Draft"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formData.is_published ? "Visible on website" : "Only you can see"}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={formData.is_published}
                                        onCheckedChange={(val) => setFormData({ ...formData, is_published: val })}
                                        className="data-[state=checked]:bg-emerald-500"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3 pt-2">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={saving || uploadingImage || !formData.title.trim()}
                                        className={`w-full h-14 rounded-xl font-bold text-base shadow-lg transition-all active:scale-[0.98] ${formData.is_published
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200'
                                            : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-200'
                                            }`}
                                    >
                                        {saving || uploadingImage ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {uploadingImage ? "Uploading..." : "Saving..."}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Save className="w-5 h-5" />
                                                {editId
                                                    ? "Update Post"
                                                    : formData.is_published
                                                        ? "Publish Now"
                                                        : "Save Draft"
                                                }
                                            </div>
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => navigate("/admin/blogs")}
                                        className="w-full h-12 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </motion.div>

                        {/* AI Assistant Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100"
                        >
                            <h4 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
                                <Wand2 className="w-4 h-4" />
                                AI Assistant
                            </h4>
                            <ul className="text-sm text-violet-700/80 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                                    Enter a topic above to generate title
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                                    Click "AI Generate" on each field
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                                    AI writes in Bengali (বাংলা)
                                </li>
                            </ul>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (formData.title) {
                                        generateWithAI('summary', formData.title);
                                        setTimeout(() => generateWithAI('content', formData.title), 1000);
                                    }
                                }}
                                disabled={!formData.title || generatingSummary || generatingContent}
                                className="w-full mt-4 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-100"
                            >
                                {generatingSummary || generatingContent ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Generate All Content
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AddBlog;
