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

async function checkSubscriptions(email = 'student@gmail.com') {
    console.log(`Checking subscriptions for ${email}...`);
    const { data: profile } = await supabase.from('profiles').select('id, email, full_name').eq('email', email).maybeSingle();

    if (!profile) {
        console.log("Profile not found by exact email. Listing all profiles:");
        const { data: allProfiles } = await supabase.from('profiles').select('email, full_name').limit(10);
        console.log(allProfiles);
        return;
    }

    console.log("Profile found:", profile);

    const { data: purchases, error: pError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', profile.id);

    if (pError) {
        console.error("Error fetching purchases:", pError.message);
        return;
    }
    console.log("Purchases found:", purchases);
}

checkSubscriptions(process.argv[2]);
