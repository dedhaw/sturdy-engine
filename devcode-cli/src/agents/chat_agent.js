const BaseAgent = require('./base');

class ChatAgent extends BaseAgent {
  constructor(client) {
    super(client, 'ChatAgent');
  }
}

module.exports = ChatAgent;
