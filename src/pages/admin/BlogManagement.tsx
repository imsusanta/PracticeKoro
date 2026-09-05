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
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 border border-white/20 shadow-lg shadow-emerald-500/20"
        >
            <Plus className="w-5 h-5" />
        </Button>
    );

    if (loading) {
        return (
            <AdminLayout title="Blog Management" subtitle="Create and manage blog posts">
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Blog Management" subtitle="Create and manage blog posts" headerActions={CreateButton}>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Total Posts", value: stats.total, color: "from-slate-500 to-slate-600" },
                    { label: "Published", value: stats.published, color: "from-emerald-500 to-teal-600" },
                    { label: "Drafts", value: stats.drafts, color: "from-amber-500 to-orange-600" }
                ].map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-2xl p-4 shadow-sm"
                    >
                        <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                            {stat.value}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search blogs..."
                        className="pl-10 h-11 rounded-xl border-gray-200 bg-white focus:bg-white transition-all shadow-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-44 h-11 rounded-xl border-gray-200 bg-white shadow-sm">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Posts</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Drafts</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Blog Grid */}
            {filteredBlogs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Newspaper className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 text-lg">No Blog Posts Found</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                        Create your first blog post to share updates with students.
                    </p>
                    <Button
                        onClick={() => navigate("/admin/blogs/new")}
                        className="rounded-xl px-6 bg-emerald-500 hover:bg-emerald-600 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Create First Post
                    </Button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredBlogs.map((blog, idx) => (
                        <motion.div
                            key={blog.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
                                {blog.image_url ? (
                                    <img
                                        src={blog.image_url}
                                        alt={blog.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-12 h-12 text-gray-200" />
                                    </div>
                                )}

                                {/* Status Badge */}
                                <div className="absolute top-3 left-3">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${blog.is_published
                                        ? "bg-emerald-500/90 text-white"
                                        : "bg-amber-500/90 text-white"
                                        }`}>
                                        {blog.is_published ? "Published" : "Draft"}
                                    </span>
                                </div>

                                {/* Category Badge */}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r ${CATEGORY_COLORS[blog.author || "General Knowledge"] || CATEGORY_COLORS["General Knowledge"]} text-white`}>
                                        {blog.author || "General Knowledge"}
                                    </span>
                                </div>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Button
                                        size="sm"
                                        className="rounded-xl bg-white/90 text-gray-900 hover:bg-white"
                                        onClick={() => navigate(`/admin/blogs/new?edit=${blog.id}`)}
                                    >
                                        <Edit className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 leading-snug">
                                    {blog.title}
                                </h3>

                                {blog.excerpt && (
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">
                                        {blog.excerpt}
                                    </p>
                                )}

                                {/* Meta & Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(blog.created_at)}</span>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                            <DropdownMenuItem
                                                onClick={() => navigate(`/admin/blogs/new?edit=${blog.id}`)}
                                                className="rounded-lg"
                                            >
                                                <Edit className="w-4 h-4 mr-2" /> Edit Post
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => window.open(`/${blog.slug || blog.id}`, '_blank')}
                                                className="rounded-lg"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" /> View Post
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => togglePublish(blog)}
                                                className="rounded-lg"
                                            >
                                                {blog.is_published ? (
                                                    <>
                                                        <EyeOff className="w-4 h-4 mr-2" /> Unpublish
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="w-4 h-4 mr-2" /> Publish
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(blog)}
                                                className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

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
