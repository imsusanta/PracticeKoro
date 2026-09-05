import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Clock, Share2, Home, ChevronRight, Bookmark, Heart, MessageCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

interface BlogPost {
    id: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    image_url: string | null;
    author: string | null;
    created_at: string;
    category?: string | null;
}

const BlogDetail = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [blog, setBlog] = useState<BlogPost | null>(null);
    const [recommendedBlogs, setRecommendedBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (slug) {
            // Scroll to top when navigating to a new blog
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLoading(true);
            fetchBlog(slug);
        }
    }, [slug]);

    const fetchBlog = async (blogSlug: string) => {
        try {
            // First try to find by slug
            let { data, error: fetchError } = await supabase
                .from("blog_posts")
                .select("*")
                .eq("slug", blogSlug)
                .eq("is_published", true)
                .maybeSingle();

            // If not found by slug, try by ID (UUID) for backwards compatibility
            if (!data && !fetchError) {
                const idResult = await supabase
                    .from("blog_posts")
                    .select("*")
                    .eq("id", blogSlug)
                    .eq("is_published", true)
                    .maybeSingle();

                data = idResult.data;
                fetchError = idResult.error;
            }

            if (fetchError || !data) {
                setError(true);
                return;
            }

            setBlog(data as BlogPost);

            // Fetch recommended blogs
            const { data: recommendations } = await supabase
                .from("blog_posts")
                .select("id, slug, title, excerpt, image_url, author, created_at")
                .eq("is_published", true)
                .neq("id", data.id)
                .order("created_at", { ascending: false })
                .limit(3);

            setRecommendedBlogs(recommendations as BlogPost[] || []);
        } catch (e) {
            console.error("Error fetching blog:", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getReadTime = (content: string | null) => {
        const wordCount = (content || "").split(/\s+/).length;
        const minutes = Math.max(3, Math.ceil(wordCount / 200));
        return `${minutes} min read`;
    };

    const handleShare = async () => {
        if (navigator.share && blog) {
            try {
                await navigator.share({
                    title: blog.title,
                    text: blog.excerpt || "",
                    url: window.location.href,
                });
            } catch (e) {
                console.log("Share cancelled");
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Copied!",
                description: "Article link copied to clipboard",
            });
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 border-4 border-emerald-100 rounded-full" />
                        <div className="absolute inset-0 w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-gray-500 font-medium">Loading article...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (error || !blog) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md bg-white rounded-3xl p-8 shadow-xl shadow-gray-100/50 border border-gray-100"
                >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">📄</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
                    <p className="text-gray-500 mb-8">The article you're looking for doesn't exist or has been removed.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            onClick={() => navigate("/")}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="rounded-xl border-gray-200"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-white">
            {/* SEO Meta Tags */}
            <Helmet>
                <title>{blog.title} | Practice Koro Blog</title>
                <meta name="description" content={blog.excerpt || `${blog.title} - Read this article on Practice Koro for exam preparation tips.`} />

                {/* Open Graph Tags for Facebook/LinkedIn */}
                <meta property="og:title" content={blog.title} />
                <meta property="og:description" content={blog.excerpt || blog.title} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={window.location.href} />
                {blog.image_url && <meta property="og:image" content={blog.image_url} />}
                <meta property="og:site_name" content="Practice Koro" />
                <meta property="article:published_time" content={blog.created_at} />
                <meta property="article:author" content={blog.author || "Practice Koro"} />
                <meta property="article:section" content={blog.category || "Exam Preparation"} />

                {/* Twitter Card Tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={blog.title} />
                <meta name="twitter:description" content={blog.excerpt || blog.title} />
                {blog.image_url && <meta name="twitter:image" content={blog.image_url} />}

                {/* Additional SEO Tags */}
                <meta name="keywords" content={`${blog.category || ''}, exam preparation, WBCS, SSC, Railway, Bank exam, government job, mock test, Practice Koro`} />
                <meta name="author" content={blog.author || "Practice Koro"} />
                <link rel="canonical" href={window.location.href} />

                {/* Structured Data / JSON-LD */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": blog.title,
                        "description": blog.excerpt || blog.title,
                        "image": blog.image_url || "",
                        "datePublished": blog.created_at,
                        "author": {
                            "@type": "Organization",
                            "name": blog.author || "Practice Koro"
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "Practice Koro",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://practicekoro.com/logo.png"
                            }
                        },
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": window.location.href
                        }
                    })}
                </script>
            </Helmet>

            {/* Main Header with Logo */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100"
            >
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left - Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">Practice Koro</span>
                    </Link>

                    {/* Center - Empty/Spacer */}
                    <div className="flex-1" />

                    {/* Right - Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Share article"
                            onClick={handleShare}
                            className="text-gray-600 hover:text-emerald-600 rounded-xl"
                        >
                            <Share2 className="w-4 h-4" />
                        </Button>
                        <Link to="/login">
                            <Button
                                size="sm"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.header>

            {/* Hero Section - Refined Bright Editorial Layout */}
            <div className="relative bg-white pt-8 md:pt-10 pb-12 md:pb-16 overflow-hidden border-b border-gray-100/50">
                {/* 1. Ultra-Subtle Ambient Haze */}
                {blog.image_url && (
                    <div
                        className="absolute inset-0 scale-150 blur-[140px] opacity-[0.04] select-none pointer-events-none z-0"
                        style={{
                            backgroundImage: `url(${blog.image_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    />
                )}

                <div className="relative z-10 max-w-5xl mx-auto px-6">
                    {/* Breadcrumb Navigation Above Headline */}
                    <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs mb-8 md:mb-12">
                        <Link to="/" className="text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            Home
                        </Link>
                        <ChevronRight className="w-3 h-3 text-gray-200" />
                        <Link to="/blog" className="text-gray-400 hover:text-emerald-600 transition-colors">Blog</Link>
                        <ChevronRight className="w-3 h-3 text-gray-200" />
                        <span className="text-gray-500 font-medium truncate max-w-[150px] md:max-w-[240px]">{blog.title}</span>
                    </div>

                    {/* 2. Top Section: Centered Typography Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10 md:mb-12"
                    >
                        {/* Category Label - More Subtle */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <span className="px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                {blog.author || "General"}
                            </span>
                        </div>

                        {/* Refined Headline - Balanced Scale (2xl to 3xl) */}
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-tight tracking-tight mb-6 font-baloo max-w-3xl mx-auto">
                            {blog.title}
                        </h1>

                        {/* Refined Meta Context - Gray Themed */}
                        <div className="flex flex-wrap items-center justify-center gap-5 text-gray-400 font-medium">
                            <div className="flex items-center gap-2.5 group">
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                    <User className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <span className="text-sm tracking-wide text-gray-600">PracticeKoro Team</span>
                            </div>

                            <div className="flex items-center gap-2 group">
                                <Calendar className="w-4 h-4 text-emerald-500/40" />
                                <span className="text-sm tracking-wide text-gray-500">{formatDate(blog.created_at)}</span>
                            </div>

                            <div className="flex items-center gap-2 group">
                                <Clock className="w-4 h-4 text-emerald-500/40" />
                                <span className="text-sm tracking-wide text-gray-500">{getReadTime(blog.content)}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. Middle Section: Compact Framed Image */}
                    {blog.image_url && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.6 }}
                            className="relative group/hero shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] rounded-[2rem] overflow-hidden max-w-4xl mx-auto"
                        >
                            <img
                                src={blog.image_url}
                                alt={blog.title}
                                className="w-full h-auto max-h-[55vh] object-cover transition-transform duration-[1.2s] ease-out group-hover/hero:scale-[1.03]"
                            />
                            {/* Subtle Glass Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-40 pointer-events-none" />
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Article Content */}
            <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-3xl mx-auto px-4 py-10 sm:py-12"
            >
                {/* Excerpt/Lead */}
                {blog.excerpt && (
                    <div
                        className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-8 pb-8 border-b border-gray-100"
                        dangerouslySetInnerHTML={{ __html: blog.excerpt }}
                    />
                )}

                {/* Main Content */}
                <div className="prose prose-lg prose-emerald max-w-none text-gray-700 leading-relaxed text-base sm:text-lg">
                    {blog.content ? (
                        <div
                            dangerouslySetInnerHTML={{ __html: blog.content }}
                        />
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl">
                            <p className="text-gray-400 italic">No content available for this article.</p>
                        </div>
                    )}
                </div>

                {/* Tags / Share Section */}
                <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-500">Tags:</span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                {blog.category || "General"}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Exam Prep
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 mr-2">Share:</span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleShare}
                                className="w-10 h-10 rounded-xl border-gray-200 hover:border-emerald-300 hover:text-emerald-600 shadow-sm"
                                title="Share this post"
                            >
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Author Card */}
                <div className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                            P
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-500 mb-1">Written by</p>
                            <h4 className="font-bold text-gray-900 text-lg">PracticeKoro Team</h4>
                            <p className="text-sm text-gray-500 mt-1">
                                Providing the latest updates and resources for government exam preparation.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.article>

            {/* Recommended Blogs Section */}
            {recommendedBlogs.length > 0 && (
                <section className="max-w-5xl mx-auto px-6 py-16 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
                            <p className="text-gray-500 text-sm mt-1">More articles to help your preparation</p>
                        </div>
                        <Link to="/blog" className="text-emerald-600 font-semibold text-sm hover:underline flex items-center gap-1">
                            View All Posts
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recommendedBlogs.map((post) => (
                            <Link key={post.id} to={`/${post.slug || post.id}`} className="group">
                                <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                                    <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                                        <img
                                            src={post.image_url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                                                {post.author || "General"}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {formatDate(post.created_at)}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-snug">
                                            {post.title}
                                        </h3>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-16 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
                        <span>🎯</span>
                        <span>Start Your Preparation</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                        Ready to Crack Your Exam?
                    </h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                        Join thousands of students preparing with Practice Koro. Start your free mock test today!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/register">
                            <Button className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-6 text-base font-bold shadow-lg shadow-emerald-500/20">
                                Start Free Mock Test
                                <ChevronRight className="w-5 h-5 ml-1" />
                            </Button>
                        </Link>
                        <Link to="/">
                            <Button variant="outline" className="w-full sm:w-auto rounded-xl px-8 py-6 text-base font-bold border-gray-200 hover:border-emerald-300">
                                <Home className="w-5 h-5 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-gray-100 py-6 px-4">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} Practice Koro. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                            Home
                        </Link>
                        <Link to="/login" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                            Login
                        </Link>
                        <Link to="/register" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                            Register
                        </Link>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default BlogDetail;
