import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(email: string) {
    console.log(`Checking status for ${email}...`);

    // Note: This might fail if RLS is enabled and we are using the anon key
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        return;
    }

    console.log("Found profile:", profile);

    const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'completed');

    if (purchaseError) {
        console.error("Error fetching purchases:", purchaseError.message);
        return;
    }

    if (purchases && purchases.length > 0) {
        console.log("PAYMENT STATUS: PAID");
        console.log("Purchases:", purchases);
    } else {
        console.log("PAYMENT STATUS: FREE (No completed purchases found)");
    }
}

const email = process.argv[2] || 'student@gmail.com';
checkUser(email);
