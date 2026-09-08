const { createScriptClient } = require("./loadEnv.cjs");

const supabase = createScriptClient();

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
