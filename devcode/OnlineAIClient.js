const { OpenAI } = require("openai");

class OnlineAIClient {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async chatCompletion(messages, onToken) {
    const systemPrompt = {
      role: "system",
      content: "Please respond only using valid HTML formatting tags (like <p>, <pre>, <code>, <strong>, etc.). Do not include markdown syntax."
    };

    const prompt = [systemPrompt, ...messages];

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt,
      stream: true,
    });

    for await (const part of completion) {
      const token = part.choices[0].delta?.content;
      if (token && onToken) {
        onToken(token);
      }
    }
  }
}

module.exports = OnlineAIClient;