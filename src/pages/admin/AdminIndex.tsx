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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center" style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-emerald-700 font-semibold text-lg">Checking Access</p>
                    <p className="text-gray-400 text-sm">Please wait...</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminIndex;
