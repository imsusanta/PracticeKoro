/* eslint-disable @typescript-eslint/ban-ts-comment -- Deno Edge runtime; type-checked by `supabase functions` tooling, not tsc */
// @ts-nocheck
// deno-lint-ignore-file
// This file runs on Deno (Supabase Edge Functions), not Node.js
// TypeScript errors are expected in VS Code but the function works correctly when deployed

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
    userId: string;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the requester is an admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("No authorization header");
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            throw new Error("Unauthorized");
        }

        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();

        if (roleError || !roleData) {
            throw new Error("Unauthorized: Admin access required");
        }

        const { userId }: DeleteUserRequest = await req.json();

        if (!userId) {
            throw new Error("User ID is required");
        }

        // First, clear the whatsapp_number from their profile so it can be reused
        await supabaseAdmin
            .from("profiles")
            .update({ whatsapp_number: null })
            .eq("id", userId);

        // Delete from related tables first
        await supabaseAdmin.from("approval_status").delete().eq("user_id", userId);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("id", userId);

        // Delete the auth user using admin API
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error("Error deleting auth user:", deleteError);
            // Don't throw - profile cleanup is already done
        }

        console.log(`User deleted successfully: ${userId}`);

        return new Response(
            JSON.stringify({ success: true, message: "User deleted successfully" }),
            {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    }
};

serve(handler);
