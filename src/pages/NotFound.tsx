import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  // Determine if we're in admin section
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-6" style={{ boxShadow: '0 12px 40px rgba(99, 102, 241, 0.25)' }}>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-violet-600">404</h1>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Oops! Page not found</h2>
          <p className="text-slate-500 text-sm sm:text-base mb-8 px-4">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline" className="h-12 rounded-xl px-6 font-bold border-2">
            <Link to={isAdminRoute ? "/admin/login" : "/login"}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isAdminRoute ? "Admin sign in" : "Sign in"}
            </Link>
          </Button>
          <Button asChild className="h-12 rounded-xl px-6 font-bold bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
