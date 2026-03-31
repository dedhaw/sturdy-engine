const BaseAgent = require('./base');

class ChatAgent extends BaseAgent {
  constructor(client) {
    super(client, 'ChatAgent');
  }

  getSystemPrompt() {
    return "You are DevCode CLI, an advanced coding assistant. Provide clear, concise, and helpful responses to programming questions. Use markdown for code formatting.";
  }
}

module.exports = ChatAgent;
