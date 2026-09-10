import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Newspaper, Plus, Trash2, Search, Edit, Eye, EyeOff,
    Image as ImageIcon, Calendar, User, MoreVertical, ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin/AdminLayout";
import { DeleteAlertDialog } from "@/components/admin/DeleteAlertDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

interface BlogPost {
    id: string;
    title: string;
    slug?: string | null;
    excerpt: string | null;
    content: string | null;
    image_url: string | null;
    author: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    "Recruitment": "from-blue-500 to-cyan-500",
    "Strategy": "from-purple-500 to-pink-500",
    "Syllabus": "from-amber-500 to-orange-500",
    "Current Affairs": "from-rose-500 to-red-500",
    "Study Tips": "from-emerald-500 to-teal-500",
    "Notifications": "from-indigo-500 to-violet-500",
    "General Knowledge": "from-slate-500 to-gray-500"
};

const BlogManagement = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [blogToDelete, setBlogToDelete] = useState<BlogPost | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
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

        await loadBlogs();
        setLoading(false);
    };

    const loadBlogs = async () => {
        const { data, error } = await supabase
            .from("blog_posts")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            toast({ title: "Error", description: "Failed to load blogs", variant: "destructive" });
            return;
        }
        setBlogs((data || []) as BlogPost[]);
    };

    const handleDelete = async (blog: BlogPost) => {
        setBlogToDelete(blog);
    };

    const confirmDelete = async () => {
        if (!blogToDelete) return;
        setIsDeleting(true);
        try {
            if (blogToDelete.image_url) {
                const imagePath = blogToDelete.image_url.split('/').pop();
                if (imagePath) {
                    await supabase.storage.from("blog-images").remove([imagePath]);
                }
            }

            const { error } = await supabase.from("blog_posts").delete().eq("id", blogToDelete.id);
            if (error) throw error;
            toast({ title: "Success", description: "Blog post deleted" });
            await loadBlogs();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setBlogToDelete(null);
        }
    };

    const togglePublish = async (blog: BlogPost) => {
        try {
            const { error } = await supabase
                .from("blog_posts")
                .update({ is_published: !blog.is_published, updated_at: new Date().toISOString() })
                .eq("id", blog.id);
            if (error) throw error;
            toast({ title: "Success", description: blog.is_published ? "Blog unpublished" : "Blog published" });
            await loadBlogs();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Filter blogs
    const filteredBlogs = blogs.filter(blog => {
        const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (blog.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "all" ||
            (filterStatus === "published" && blog.is_published) ||
            (filterStatus === "draft" && !blog.is_published);
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: blogs.length,
        published: blogs.filter(b => b.is_published).length,
        drafts: blogs.filter(b => !b.is_published).length
    };

    const CreateButton = (
        <Button
            onClick={() => navigate("/admin/blogs/new")}
            size="icon"
            className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 text-white"
        >
            <Plus className="w-5 h-5" />
        </Button>
    );

    if (loading) {
        return (
            <AdminLayout title="Blog Management" subtitle="Create and manage blog posts">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Blog Management" subtitle="Create and manage blog posts" headerActions={CreateButton}>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Editorial & Blog Articles</h1>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Publish recruitment alerts, exam strategies, and educational updates</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50/50 text-blue-700 border-blue-200">
                            {stats.total} Total Articles
                        </Badge>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-50/70 to-indigo-50/30 border border-blue-100/80 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Posts</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                <Newspaper className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.total}</p>
                        <p className="text-[11px] text-blue-600 font-semibold mt-0.5">All written articles</p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-emerald-50/90 to-teal-50/40 border border-emerald-200/90 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Live & Published</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                                <Eye className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">{stats.published}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Visible to students & web</p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-amber-50/70 to-orange-50/30 border border-amber-100/80 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Draft Articles</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center">
                                <EyeOff className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">{stats.drafts}</p>
                        <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Unpublished work</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search blogs by title or excerpt..."
                            className="pl-10 h-11 rounded-2xl border-slate-200/90 bg-white shadow-2xs text-sm focus:ring-2 focus:ring-blue-500/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-48 h-11 rounded-2xl border-slate-200/90 bg-white shadow-2xs text-xs font-bold text-slate-700">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-lg border-slate-200">
                            <SelectItem value="all">All Posts</SelectItem>
                            <SelectItem value="published">Published Only</SelectItem>
                            <SelectItem value="draft">Drafts Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Blog Grid */}
                {filteredBlogs.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs">
                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <Newspaper className="w-8 h-8" />
                        </div>
                        <h3 className="font-black text-slate-900 mb-1 text-lg">No Blog Posts Found</h3>
                        <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
                            Create your first blog post to share updates with students.
                        </p>
                        <Button
                            onClick={() => navigate("/admin/blogs/new")}
                            className="rounded-2xl px-5 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 text-xs"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create First Post
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredBlogs.map((blog, idx) => (
                            <div
                                key={blog.id}
                                className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col"
                            >
                                {/* Image */}
                                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                                    {blog.image_url ? (
                                        <img
                                            src={blog.image_url}
                                            alt={blog.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ImageIcon className="w-12 h-12" />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${blog.is_published
                                            ? "bg-emerald-600/90 text-white shadow-xs"
                                            : "bg-amber-600/90 text-white shadow-xs"
                                            }`}>
                                            {blog.is_published ? "Published" : "Draft"}
                                        </span>
                                    </div>

                                    {/* Category Badge */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${CATEGORY_COLORS[blog.author || "General Knowledge"] || CATEGORY_COLORS["General Knowledge"]} text-white shadow-xs`}>
                                            {blog.author || "General Knowledge"}
                                        </span>
                                    </div>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-white text-slate-900 hover:bg-white/95 font-bold shadow-lg"
                                            onClick={() => navigate(`/admin/blogs/new?edit=${blog.id}`)}
                                        >
                                            <Edit className="w-4 h-4 mr-1.5 text-blue-600" /> Edit Post
                                        </Button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                        {blog.title}
                                    </h3>

                                    {blog.excerpt && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1 leading-relaxed">
                                            {blog.excerpt}
                                        </p>
                                    )}

                                    {/* Meta & Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(blog.created_at)}</span>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-100">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-lg border-slate-200">
                                                <DropdownMenuItem
                                                    onClick={() => navigate(`/admin/blogs/new?edit=${blog.id}`)}
                                                    className="rounded-xl gap-2 cursor-pointer"
                                                >
                                                    <Edit className="w-4 h-4 text-blue-600" /> Edit Post
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => window.open(`/${blog.slug || blog.id}`, '_blank')}
                                                    className="rounded-xl gap-2 cursor-pointer"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-slate-500" /> View Post
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => togglePublish(blog)}
                                                    className="rounded-xl gap-2 cursor-pointer"
                                                >
                                                    {blog.is_published ? (
                                                        <>
                                                            <EyeOff className="w-4 h-4 text-amber-600" /> Unpublish
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-4 h-4 text-emerald-600" /> Publish
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(blog)}
                                                    className="rounded-xl gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <DeleteAlertDialog
                isOpen={!!blogToDelete}
                onClose={() => setBlogToDelete(null)}
                onConfirm={confirmDelete}
                itemName={blogToDelete?.title}
                isDeleting={isDeleting}
            />
        </AdminLayout>
    );
};

export default BlogManagement;
