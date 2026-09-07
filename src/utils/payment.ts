import { supabase } from "@/integrations/supabase/client";
import { env } from "@/lib/env";

interface PaymentDetails {
    amount: number;
    contentId: string;
    contentType: 'test' | 'note' | 'exam' | 'subscription';
    title: string;
    description?: string;
}

export const initRazorpayPayment = async ({
    amount,
    contentId,
    contentType,
    title,
    description = "Purchase premium content"
}: PaymentDetails) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("User not authenticated");

    // 1. Create order on backend for security
    const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-handler', {
        body: {
            action: 'create-order',
            amount: amount,
            receipt: `rcpt_${contentId.substring(0, 10)}_${Date.now().toString().slice(-6)}`
        }
    });

    if (orderError || orderData.error) {
        throw new Error(orderError?.message || orderData.error || "Failed to initiate secure payment order");
    }

    return new Promise((resolve, reject) => {
        const options = {
            key: env.razorpayKey || "rzp_test_placeholder",
            amount: orderData.amount, // Amount in paise from order
            currency: "INR",
            name: "PracticeKoro",
            description: `Purchase: ${title}`,
            order_id: orderData.id,
            image: "/icons/icon-192x192.png",
            handler: async function (response: any) {
                try {
                    // 2. Verify payment on backend securely
                    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-handler', {
                        body: {
                            action: 'verify-payment',
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            content_id: contentId,
                            content_type: contentType as any,
                            amount: amount,
                        }
                    });

                    if (verifyError || verifyData?.error) {
                        throw new Error(verifyError?.message || verifyData?.error || "Payment verification failed");
                    }

                    resolve(response);
                } catch (err) {
                    reject(err);
                }
            },
            prefill: {
                name: session?.user?.user_metadata?.full_name || "",
                email: session?.user?.email || "",
                contact: session?.user?.user_metadata?.whatsapp_number || ""
            },
            theme: {
                color: "#6366f1" // Indigo-500
            }
        };

        if (options.key === "rzp_test_placeholder") {
            console.warn("Razorpay Key is missing. Please set VITE_RAZORPAY_KEY in your .env file.");
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
            reject(new Error(response.error.description));
        });
        rzp.open();
    });
};
