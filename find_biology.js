import { createClient } from '@supabase/supabase-js';

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
