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

async function dumpData() {
    console.log("Supabase Project:", supabaseUrl);

    console.log("\n--- TABLE: purchases ---");
    const { data: purchases, error: pError } = await supabase.from('purchases').select('*').limit(30);
    if (pError) console.error("Error purchases:", pError.message);
    else console.log(JSON.stringify(purchases, null, 2));

    console.log("\n--- TABLE: profiles ---");
    const { data: profiles, error: prError } = await supabase.from('profiles').select('id, email, full_name').limit(15);
    if (prError) console.error("Error profiles:", prError.message);
    else console.log(JSON.stringify(profiles, null, 2));
}

dumpData();
