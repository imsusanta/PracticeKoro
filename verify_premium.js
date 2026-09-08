import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPremium(email) {
    console.log(`Verifying premium status for: ${email}`);

    // 1. Get profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (pError) {
        console.error("Error fetching profile:", pError.message);
        return;
    }

    if (!profile) {
        console.log("Profile not found. Checking if any profiles exist reachable by this key...");
        const { data: anyProfiles } = await supabase.from('profiles').select('email').limit(5);
        console.log("Reachable profiles:", anyProfiles);
        return;
    }

    console.log("Found Profile:", JSON.stringify(profile, null, 2));

    // 2. Get purchases
    const { data: purchases, error: purError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', profile.id);

    if (purError) {
        console.error("Error fetching purchases:", purError.message);
        return;
    }

    console.log("Found Purchases:", JSON.stringify(purchases, null, 2));
}

verifyPremium('student@gmail.com');
