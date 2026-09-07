const { createScriptClient } = require("./loadEnv.cjs");

const supabase = createScriptClient();

async function fixLinks() {
    console.log("Starting fix...");

    // 1. Fetch all subjects for questions
    const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('category', 'questions');

    console.log(`Found ${subjects?.length || 0} subjects in questions category.`);

    // 2. Fetch questions without subject_id
    const { data: questions } = await supabase
        .from('questions')
        .select('id, subject, topic')
        .is('subject_id', null);

    console.log(`Found ${questions?.length || 0} questions without subject_id.`);

    if (!questions || !subjects) return;

    let fixedSubjects = 0;
    for (const q of questions) {
        if (!q.subject) continue;

        const match = subjects.find(s => s.name.toLowerCase() === q.subject.toLowerCase());
        if (match) {
            const { error } = await supabase
                .from('questions')
                .update({ subject_id: match.id })
                .eq('id', q.id);

            if (!error) fixedSubjects++;
            else console.error(`Error updating question ${q.id}:`, error);
        }
    }
    console.log(`Fixed subject_id for ${fixedSubjects} questions.`);

    // 3. Repeat for Topics
    const { data: topics } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('category', 'questions');

    console.log(`Found ${topics?.length || 0} topics in questions category.`);

    const { data: questionsNoTopic } = await supabase
        .from('questions')
        .select('id, topic, subject_id')
        .is('topic_id', null);

    console.log(`Found ${questionsNoTopic?.length || 0} questions without topic_id.`);

    if (!questionsNoTopic || !topics) return;

    let fixedTopics = 0;
    for (const q of questionsNoTopic) {
        if (!q.topic) continue;

        // Match topic by name AND subject_id (to be safe)
        const match = topics.find(t =>
            t.name.toLowerCase() === q.topic.toLowerCase() &&
            t.subject_id === q.subject_id
        );

        if (match) {
            const { error } = await supabase
                .from('questions')
                .update({ topic_id: match.id })
                .eq('id', q.id);

            if (!error) fixedTopics++;
            else console.error(`Error updating question ${q.id} topic:`, error);
        }
    }
    console.log(`Fixed topic_id for ${fixedTopics} questions.`);
}

fixLinks();
