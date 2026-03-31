class BaseAgent {
  constructor(client, name = 'BaseAgent') {
    this.client = client;
    this.name = name;
  }

  getSystemPrompt() {
    return "You are a helpful AI assistant.";
  }

  async run(userInput, history = [], onToken = null, options = {}) {
    const messages = [
      { role: "system", content: this.getSystemPrompt() },
      ...history,
      { role: "user", content: userInput }
    ];

    try {
      // client.chatCompletion should handle provider/model in options
      return await this.client.chatCompletion(messages, onToken, options);
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw error;
    }
  }
}

module.exports = BaseAgent;
