import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPathFor, getAccessFlags } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get("code");
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");

            // Client may already have exchanged the PKCE code via detectSessionInUrl
            let { data: { session } } = await supabase.auth.getSession();

            if (!session && code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error("Error exchanging auth code:", error);
                    ({ data: { session } } = await supabase.auth.getSession());
                    if (!session) {
                        navigate("/login?error=auth_failed", { replace: true });
                        return;
                    }
                }
            } else if (!session && accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error("Error setting session:", error);
                    navigate("/login?error=auth_failed", { replace: true });
                    return;
                }
            }

            ({ data: { session } } = await supabase.auth.getSession());

            if (session) {
                const intendedPath = sessionStorage.getItem("authRedirect");
                sessionStorage.removeItem("authRedirect");
                if (intendedPath) {
                    navigate(intendedPath, { replace: true });
                    return;
                }
                const flags = await getAccessFlags(session.user.id);
                navigate(dashboardPathFor(flags), { replace: true });
            } else {
                navigate("/login", { replace: true });
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-slate-600 font-medium">Completing sign in...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
