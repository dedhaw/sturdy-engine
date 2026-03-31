#!/usr/bin/env node

const { program } = require('commander');
const prompts = require('prompts');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BackendClient = require('./api_clients/backend_client');
const ChatAgent = require('./agents/chat_agent');

// Basic package.json info
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

program
  .name('devcode')
  .description('A CLI tool for AI-powered coding assistance')
  .version(packageJson.version);

program
  .command('chat')
  .description('Start an interactive chat with the AI')
  .option('-p, --provider <provider>', 'AI provider to use (openai or ollama)', 'openai')
  .option('-m, --model <model>', 'Specific model to use')
  .action(async (cmd) => {
    const { provider, model } = cmd;
    
    // We connect to the backend on port 8040
    const client = new BackendClient('http://localhost:8040');
    const agent = new ChatAgent(client);
    const history = [];

    console.log(chalk.blue(`DevCode CLI Chat (${provider}${model ? ': ' + model : ''}) - Type "exit" to quit`));

    while (true) {
      const response = await prompts({
        type: 'text',
        name: 'userInput',
        message: chalk.green('You:'),
      });

      if (!response.userInput || response.userInput.toLowerCase() === 'exit') {
        console.log(chalk.blue('Goodbye!'));
        break;
      }

      process.stdout.write(chalk.cyan('Bot: '));
      
      let fullResponse = '';
      try {
        // We pass provider and model to the agent's run method
        await agent.run(response.userInput, history, (token) => {
          process.stdout.write(token);
          fullResponse += token;
        }, { provider, model });
        
        process.stdout.write('\n');
        
        // Add to history
        history.push({ role: 'user', content: response.userInput });
        history.push({ role: 'assistant', content: fullResponse });
        
        // Keep history manageable
        if (history.length > 20) {
          history.splice(0, 2);
        }
      } catch (error) {
        console.error(chalk.red('\nError: ' + error.message));
        console.log(chalk.yellow('Make sure the backend is running at http://localhost:8040'));
      }
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
