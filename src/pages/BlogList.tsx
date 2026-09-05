import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, Search, Filter, X, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { LoadError } from "@/components/PageState";

interface BlogPost {
    id: string;
    slug?: string;
    title: string;
    excerpt: string | null;
    image_url: string | null;
    author: string | null; // Used as category
    created_at: string;
}

// Available categories
const CATEGORIES = [
    { value: "all", label: "All Posts" },
    { value: "Recruitment", label: "Recruitment" },
    { value: "Syllabus", label: "Syllabus" },
    { value: "Strategy", label: "Strategy" },
    { value: "Results", label: "Results" },
    { value: "Admit Card", label: "Admit Card" },
    { value: "Study Tips", label: "Study Tips" },
    { value: "Current Affairs", label: "Current Affairs" },
    { value: "General Knowledge", label: "General Knowledge" }
];

const BlogList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [filteredBlogs, setFilteredBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");

    useEffect(() => {
        fetchBlogs();
    }, []);

    useEffect(() => {
        filterBlogs();
    }, [blogs, searchQuery, selectedCategory]);

    const fetchBlogs = async () => {
        try {
            const { data, error } = await supabase
                .from("blog_posts")
                .select("id, slug, title, excerpt, image_url, author, created_at")
                .eq("is_published", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setBlogs(data as BlogPost[] || []);
        } catch (error) {
            console.error("Error fetching blogs:", error);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    const filterBlogs = () => {
        let result = [...blogs];

        // Filter by category (using author field as category)
        if (selectedCategory !== "all") {
            result = result.filter(blog =>
                blog.author?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(blog =>
                blog.title.toLowerCase().includes(query) ||
                (blog.excerpt && blog.excerpt.toLowerCase().includes(query))
            );
        }

        setFilteredBlogs(result);
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        if (category === "all") {
            searchParams.delete("category");
        } else {
            searchParams.set("category", category);
        }
        setSearchParams(searchParams);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getReadTime = (blog: BlogPost) => {
        const wordCount = (blog.excerpt || "").split(/\s+/).length;
        const minutes = Math.max(3, Math.ceil(wordCount / 50));
        return `${minutes} min`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50/40">
            {/* SEO Meta Tags */}
            <Helmet>
                <title>Blog | Practice Koro - Exam Preparation Tips & Updates</title>
                <meta name="description" content="Read the latest exam preparation tips, syllabus updates, recruitment notifications for WBCS, SSC, Railway, Bank exams. Stay updated with Practice Koro blog." />
                <meta name="keywords" content="WBCS blog, SSC preparation tips, Railway exam updates, government job news, exam syllabus, Practice Koro" />
            </Helmet>

            {/* Header */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-0 z-50 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 shadow-lg"
            >
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Back to home"
                                onClick={() => navigate("/")}
                                className="rounded-full text-white hover:bg-white/20"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                    <span className="text-white font-bold text-lg">P</span>
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="font-bold text-lg text-white">Practice Koro</h1>
                                    <p className="text-xs text-emerald-100">Blog</p>
                                </div>
                            </Link>
                        </div>

                        <Link to="/">
                            <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                                <Home className="w-4 h-4" />
                                <span className="hidden sm:inline">Home</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Title in Header */}
                <div className="container mx-auto px-4 pb-6 text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Blog & Updates
                    </h1>
                    <p className="text-emerald-100 text-sm max-w-xl mx-auto">
                        Latest exam notifications, preparation tips & study strategies
                    </p>
                </div>
            </motion.header>

            {/* Search & Filter Section */}
            <section className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 py-4 shadow-sm">
                <div className="container mx-auto px-4">
                    {/* Search Bar */}
                    <div className="relative max-w-md mx-auto mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search articles..."
                            aria-label="Search articles"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 bg-slate-50 border-slate-200"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => handleCategoryChange(cat.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.value
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="py-8 sm:py-12">
                <div className="container mx-auto px-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : loadError ? (
                        <LoadError
                            title="Couldn't load articles"
                            description="The blog feed didn't load. Try again."
                            onRetry={() => { setLoadError(false); setLoading(true); fetchBlogs(); }}
                        />
                    ) : filteredBlogs.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No articles found</h3>
                            <p className="text-slate-500 mb-4">
                                {searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : `No articles in ${selectedCategory} category yet`
                                }
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery("");
                                    handleCategoryChange("all");
                                }}
                            >
                                Clear filters
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Results Count */}
                            <div className="mb-6 flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    Showing <span className="font-semibold text-slate-700">{filteredBlogs.length}</span> articles
                                    {selectedCategory !== "all" && (
                                        <span> in <span className="font-semibold text-emerald-600">{selectedCategory}</span></span>
                                    )}
                                </p>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredBlogs.map((blog, idx) => (
                                    <Link to={`/${blog.slug || blog.id}`} key={blog.id}>
                                        <motion.article
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
                                        >
                                            {/* Image */}
                                            <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                                                <img
                                                    src={blog.image_url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"}
                                                    alt={blog.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>

                                            {/* Content */}
                                            <div className="p-5">
                                                {/* Category & Date */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                                                        {blog.author || "General"}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(blog.created_at)}
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                                                    {blog.title}
                                                </h3>

                                                {/* Excerpt */}
                                                {blog.excerpt && (
                                                    <div
                                                        className="text-sm text-slate-500 line-clamp-2 mb-3"
                                                        dangerouslySetInnerHTML={{ __html: blog.excerpt }}
                                                    />
                                                )}

                                                {/* Read Time */}
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    {getReadTime(blog)} read
                                                </div>
                                            </div>
                                        </motion.article>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 py-8">
                <div className="container mx-auto px-4 text-center">
                    <Link to="/" className="inline-flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                            <span className="text-white font-bold">P</span>
                        </div>
                        <span className="font-bold text-white">Practice Koro</span>
                    </Link>
                    <p className="text-slate-400 text-sm">
                        Your exam preparation partner
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default BlogList;
