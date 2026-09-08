import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string) {
    const text = `${orderId}|${paymentId}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return expectedSignature === signature;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { action, ...payload } = await req.json();
        const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
        const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay keys not configured in Supabase secrets. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        if (action === "create-order") {
            const { content_id, content_type, receipt } = payload;
            let authoritativeAmount = Number(payload.amount);

            // Server-Side Authoritative Price Lookup to Prevent Price Tampering
            if (content_type === "subscription") {
                const { data: feeSetting } = await supabaseAdmin
                    .from("site_settings")
                    .select("value")
                    .eq("key", "yearly_subscription_fee")
                    .maybeSingle();

                if (feeSetting?.value) {
                    authoritativeAmount = Number(feeSetting.value);
                } else {
                    authoritativeAmount = 199; // Default fallback
                }
            } else if (content_type === "test" && content_id) {
                const { data: testData } = await supabaseAdmin
                    .from("mock_tests")
                    .select("price, is_paid")
                    .eq("id", content_id)
                    .maybeSingle();

                if (testData?.price != null) {
                    authoritativeAmount = Number(testData.price);
                }
            } else if (content_type === "note" && content_id) {
                const { data: noteData } = await supabaseAdmin
                    .from("notes")
                    .select("price, is_paid")
                    .eq("id", content_id)
                    .maybeSingle();

                if (noteData?.price != null) {
                    authoritativeAmount = Number(noteData.price);
                }
            }

            if (!authoritativeAmount || authoritativeAmount <= 0) {
                throw new Error("Invalid pricing for content");
            }

            const response = await fetch("https://api.razorpay.com/v1/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
                },
                body: JSON.stringify({
                    amount: Math.round(authoritativeAmount * 100),
                    currency: "INR",
                    receipt: receipt || `rcpt_${Date.now()}`,
                    notes: {
                        content_id: content_id || "site_yearly_subscription",
                        content_type: content_type || "subscription"
                    }
                }),
            });

            const order = await response.json();
            if (response.status !== 200) throw new Error(order.error?.description || "Failed to create order");

            return new Response(JSON.stringify(order), {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        if (action === "verify-payment") {
            const {
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                content_id,
                content_type,
            } = payload;

            // 1. Verify HMAC-SHA256 Signature
            const isValid = await verifySignature(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                RAZORPAY_KEY_SECRET
            );

            if (!isValid) {
                throw new Error("Invalid payment signature");
            }

            // 2. Prevent Replay Attack / Duplicate Recording
            const { data: existingPurchase } = await supabaseAdmin
                .from("purchases")
                .select("id")
                .eq("razorpay_payment_id", razorpay_payment_id)
                .maybeSingle();

            if (existingPurchase) {
                return new Response(JSON.stringify({ success: true, message: "Payment already recorded" }), {
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            // 3. Authenticate Student
            const authHeader = req.headers.get("Authorization")!;
            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

            if (authError || !user) throw new Error("Unauthorized");

            // 4. Fetch Razorpay Order Details for Verified Amount
            let verifiedAmount = 199;
            try {
                const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
                    headers: {
                        "Authorization": `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
                    }
                });
                if (orderRes.ok) {
                    const orderDetails = await orderRes.json();
                    verifiedAmount = (orderDetails.amount || 19900) / 100;
                }
            } catch (err) {
                console.warn("Could not fetch order from Razorpay API, using payload amount:", err);
                verifiedAmount = Number(payload.amount) || 199;
            }

            // 5. Insert Verified Purchase Record
            const { error: dbError } = await supabaseAdmin.from("purchases").insert({
                user_id: user.id,
                content_type: content_type || "subscription",
                content_id: content_id || "site_yearly_subscription",
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                amount: verifiedAmount,
                status: "completed",
            });

            if (dbError) throw dbError;

            // 6. Auto-approve student status upon completed payment
            await supabaseAdmin.from("approval_status").upsert({
                user_id: user.id,
                status: "approved",
                updated_at: new Date().toISOString()
            });

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        throw new Error("Invalid action");
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
};

serve(handler);
