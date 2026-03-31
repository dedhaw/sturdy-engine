const chalk = require('chalk');
const readline = require('readline');
const ChatAgent = require('../agents/chat_agent');
const { loadConfig } = require('../utils/config');
const { formatMarkdown } = require('../utils/formatter');
const { handleInChatCommand } = require('../utils/command_handler');

async function handleChat(client, cmd, checkDoubleTapExit) {
  const config = loadConfig();
  const provider = cmd.provider || config.provider || 'openai';
  const model = cmd.model || config.model || (provider === 'openai' ? 'gpt-4o' : null);
  
  const agent = new ChatAgent(client);
  const history = [];

  console.log(chalk.blue(`DevCode CLI Chat (${provider}${model ? ': ' + model : ''})`));
  console.log(chalk.gray('Type "/quit" to exit, "/select" to change model, "/install" to add models\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 100
  });

  rl.on('SIGINT', () => {
    checkDoubleTapExit();
  });

  while (true) {
    let input;
    try {
      input = await new Promise((resolve) => {
        rl.question(chalk.green('> '), (answer) => {
          resolve(answer.trim());
        });
      });
    } catch (e) {
      break;
    }

    if (!input) continue;
    
    const handled = await handleInChatCommand(input, client, rl);
    if (handled) continue;

    process.stdout.write(chalk.cyan('Bot: '));
    
    let fullResponse = '';
    let lastLineCount = 0;

    try {
      const currentConfig = loadConfig();
      const activeProvider = cmd.provider || currentConfig.provider || provider;
      const activeModel = cmd.model || currentConfig.model || model;

      await agent.run(input, history, (token) => {
        fullResponse += token;
        const formatted = formatMarkdown(fullResponse);
        
        if (lastLineCount > 0) {
          readline.moveCursor(process.stdout, 0, -lastLineCount);
        }
        readline.cursorTo(process.stdout, 5);
        readline.clearScreenDown(process.stdout);
        
        process.stdout.write(formatted);
        
        const cols = process.stdout.columns || 80;
        const lines = formatted.split('\n');
        let currentLineCount = 0;
        
        lines.forEach((line, index) => {
          const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
          const effectiveLength = (index === 0) ? cleanLine.length + 5 : cleanLine.length;
          currentLineCount += Math.max(1, Math.ceil(effectiveLength / cols));
        });
        
        lastLineCount = currentLineCount - 1;
      }, { provider: activeProvider, model: activeModel });
      
      process.stdout.write('\n\n');
      
      history.push({ role: 'user', content: input });
      history.push({ role: 'assistant', content: fullResponse });
      
      if (history.length > 20) {
        history.splice(0, 2);
      }
    } catch (error) {
      console.error(chalk.red('\nError: ' + error.message));
      console.log(chalk.yellow('Make sure the backend is running at http://localhost:8040'));
    }
  }
}

module.exports = { handleChat };
