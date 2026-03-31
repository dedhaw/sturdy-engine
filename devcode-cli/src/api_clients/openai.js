const { OpenAI } = require("openai/index.js");

class OpenAIClient {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async chatCompletion(messages, onToken, options = {}) {
    const { model = "gpt-4o-mini", stream = true } = options;

    const completion = await this.client.chat.completions.create({
      model,
      messages,
      stream,
    });

    if (stream) {
      for await (const part of completion) {
        const token = part.choices[0].delta?.content;
        if (token && onToken) {
          onToken(token);
        }
      }
    } else {
      return completion.choices[0].message.content;
    }
  }
}

module.exports = OpenAIClient;
