const { createScriptClient } = require("./loadEnv.cjs");

const supabase = createScriptClient({ privileged: true });

async function checkQuestionExplanations() {
    console.log("Checking questions with explanations...\n");

    // Get questions that have explanations
    const { data: withExplanations, error: err1 } = await supabase
        .from('questions')
        .select('id, question_text, explanation')
        .not('explanation', 'is', null)
        .neq('explanation', '')
        .limit(5);

    console.log("Questions WITH explanation:", withExplanations?.length || 0);
    if (withExplanations && withExplanations.length > 0) {
        console.log("Sample question with explanation:");
        console.log("  Question:", withExplanations[0].question_text.substring(0, 60) + "...");
        console.log("  Explanation:", withExplanations[0].explanation?.substring(0, 100) + "...");
    }

    console.log("\n---\n");

    // Get questions without explanations  
    const { data: withoutExplanations, error: err2 } = await supabase
        .from('questions')
        .select('id, question_text, explanation')
        .or('explanation.is.null,explanation.eq.')
        .limit(5);

    console.log("Questions WITHOUT explanation:", withoutExplanations?.length || 0);
    if (withoutExplanations && withoutExplanations.length > 0) {
        console.log("Sample question without explanation:");
        console.log("  Question:", withoutExplanations[0].question_text.substring(0, 60) + "...");
        console.log("  Explanation value:", withoutExplanations[0].explanation);
    }

    // Get total count
    const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

    console.log("\nTotal questions in database:", count);

    // Get count with explanations
    const { count: countWithExp } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .not('explanation', 'is', null)
        .neq('explanation', '');

    console.log("Questions with explanations:", countWithExp);
    console.log("Questions without explanations:", count - countWithExp);
}

checkQuestionExplanations();
