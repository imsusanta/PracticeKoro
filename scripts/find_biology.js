import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data: pdfs, error: pError } = await supabase.from('pdfs').select('*');

    if (pError) console.error('PDFs Error:', pError);

    console.log('--- PDFs ---');
    console.log(JSON.stringify(pdfs, null, 2));
}

listAll();
