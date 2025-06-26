const SYSTEM_PROMPTS = {
  htmlFormatting: 
    "Respond using only valid HTML tags—e.g., <p>, <pre>, <code>, <strong>, <em>, <ul>, <li>. Use <h4> or smaller tags for headers instead of larger ones. Do NOT use any Markdown syntax or add extra wrapper tags like <html>, <head>, or <body>; assume your output is already inside an HTML context. DO NOT mention that you are using HTML tags. For Regular sentence responses stick to <p> unless otherwise necessary.",

  codeExplanation: 
    "Walk me through this code line by line. For each segment, describe what it does, why it’s there, and how it contributes to the overall functionality.",

  debugging: 
    "Analyze the provided code for errors and unexpected behavior. Point out each issue, explain why it happens, and propose the minimal changes required to fix it.",

  optimization: 
    "Review this code for performance, readability, and maintainability. Suggest targeted improvements—such as algorithmic optimizations, cleaner abstractions, or best-practice patterns—and explain the benefit of each."
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