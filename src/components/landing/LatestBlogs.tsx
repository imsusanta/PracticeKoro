import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface BlogPost {
    id: string;
    slug?: string;
    title: string;
    excerpt: string | null;
    image_url: string | null;
    author: string | null; // Used as category
    created_at: string;
}

// Fallback static blogs in case no data from Supabase
const fallbackBlogs = [
    {
        id: "1",
        title: "WB Police Constable 2025: Notification Out",
        author: "Recruitment",
        created_at: "2025-01-24",
        image_url: "https://images.unsplash.com/photo-1579389083046-e3df9c2b3325?auto=format&fit=crop&q=80&w=800",
        excerpt: null
    },
    {
        id: "2",
        title: "WBSSC SLST (PT): 30-Day Strategy",
        author: "Strategy",
        created_at: "2025-01-20",
        image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800",
        excerpt: null
    },
    {
        id: "3",
        title: "Railway Group D: New Syllabus Breakdown",
        author: "Syllabus",
        created_at: "2025-01-18",
        image_url: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800",
        excerpt: null
    }
];

const LatestBlogs = () => {
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const { data, error } = await supabase
                .from("blog_posts")
                .select("id, slug, title, excerpt, image_url, author, created_at")
                .eq("is_published", true)
                .order("created_at", { ascending: false })
                .limit(3);

            if (error) throw error;

            if (data && data.length > 0) {
                // TODO(types): regenerate supabase types via supabase gen types (blog_posts.slug missing in generated types)
                setBlogs(data as unknown as BlogPost[]);
            } else {
                // Use fallback if no published blogs
                setBlogs(fallbackBlogs);
            }
        } catch (error) {
            console.error("Error fetching blogs:", error);
            setBlogs(fallbackBlogs);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Estimate read time based on excerpt/content length (default 5 min)
    const getReadTime = (blog: BlogPost) => {
        const wordCount = (blog.excerpt || "").split(/\s+/).length;
        const minutes = Math.max(3, Math.ceil(wordCount / 50));
        return `${minutes} min`;
    };

    if (loading) {
        return (
            <section className="py-12 bg-white relative">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-24 bg-white relative">
            <div className="container mx-auto px-4 max-w-6xl">

                {/* Ultra-Minimal Header */}
                <div className="flex items-center justify-between mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Latest Updates
                    </h2>
                    <Link to="/blog">
                        <Button variant="link" className="text-slate-500 hover:text-slate-900 font-semibold p-0">
                            View all posts <ArrowUpRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </div>

                {/* Minimal Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
                    {blogs.map((blog, idx) => (
                        <Link to={`/${blog.slug || blog.id}`} key={blog.id} className="block">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="group cursor-pointer flex flex-col"
                            >
                                {/* Image - Clean & Simple */}
                                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 mb-5">
                                    <img
                                        src={blog.image_url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"}
                                        alt={blog.title}
                                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:opacity-95"
                                    />
                                </div>

                                {/* Content - No decorations */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                                        <span className="text-emerald-600">{blog.author || "General"}</span>
                                        <span className="w-0.5 h-3 bg-slate-200"></span>
                                        <span>{formatDate(blog.created_at)}</span>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug group-hover:text-emerald-600 transition-colors">
                                        {blog.title}
                                    </h3>

                                    <p className="text-sm font-medium text-slate-400">
                                        {getReadTime(blog)} read
                                    </p>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LatestBlogs;
