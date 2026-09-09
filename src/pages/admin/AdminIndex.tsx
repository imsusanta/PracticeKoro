import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/utils/adminAuth";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

/**
 * AdminIndex - Handler for /admin/ route
 * Checks if user is logged in as admin:
 * - If logged in as admin -> redirect to /admin/dashboard
 * - If not logged in or not admin -> redirect to /admin/login
 */
const AdminIndex = () => {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);

    const checkAdminAuth = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Not logged in - go to login
                navigate("/admin/login", { replace: true });
                return;
            }

            // Check if user has admin role
            const isAdmin = await checkIsAdmin(session.user.id);

            if (isAdmin) {
                // User is admin - go to dashboard
                navigate("/admin/dashboard", { replace: true });
            } else {
                // User is logged in but not admin - go to login
                navigate("/admin/login", { replace: true });
            }
        } catch (error) {
            console.error("Error checking admin auth:", error);
            navigate("/admin/login", { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        checkAdminAuth();
    }, [checkAdminAuth]);

    // Show loading state while checking auth
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-slate-900 font-black text-base tracking-tight">Verifying Administrator Access</p>
                    <p className="text-slate-400 text-xs font-medium">Securing session...</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminIndex;
