const SYSTEM_PROMPTS = {
    htmlFormatting: "Only using valid HTML formatting tags (like <p>, <pre>, <code>, <strong>, etc.). Do not include markdown syntax.",
    
    codeExplanation: "Please explain this code step by step, focusing on what each part does.",
    debugging: "Please help debug this code and suggest fixes.",
    optimization: "Please suggest optimizations for this code."
};

function combinePrompts(basePrompt, ...additionalPrompts) {
    return [basePrompt, ...additionalPrompts].join(' ');
}

function createSystemMessage(prompt) {
    return { role: "system", content: prompt };
}

function createUserMessageWithSystem(userContent, systemPrompt) {
    return { role: "user", content: `${systemPrompt}\n\n${userContent}` };
}

module.exports = {
    SYSTEM_PROMPTS,
    combinePrompts,
    createSystemMessage,
    createUserMessageWithSystem
};