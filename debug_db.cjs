const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://tbxqueyivslrmapwmsvx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRieHF1ZXlpdnNscm1hcHdtc3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Mzg1MzAsImV4cCI6MjA4MDExNDUzMH0.9xcJOm6iG8iOZkvZv5NS0plGNKsmjBPbf44__lpdC1Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    const { data: subjects } = await supabase.from('subjects').select('id, name, category, exam_id');
    console.log('Total subjects:', subjects?.length || 0);
    if (subjects) console.log('Sample subjects:', subjects.slice(0, 5));

    const { data: questions } = await supabase.from('questions').select('id, subject, subject_id').limit(5);
    console.log('Sample questions:', questions);

    const { data: exams } = await supabase.from('exams').select('id, name');
    console.log('Exams:', exams?.length || 0);
}

debug();
