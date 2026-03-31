#!/usr/bin/env node

const { program } = require('commander');
const prompts = require('prompts');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OpenAIClient = require('./api_clients/openai');
const ChatAgent = require('./agents/chat_agent');

// Basic package.json info
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

program
  .name('devcode-cli')
  .description('A CLI tool for AI-powered coding assistance')
  .version(packageJson.version);

program
  .command('chat')
  .description('Start an interactive chat with the AI')
  .action(async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.error(chalk.red('Error: OPENAI_API_KEY not found or not set in .env file.'));
      console.log('Please update the .env file in the devcode_cli directory with your API key:');
      console.log('OPENAI_API_KEY=sk-...');
      process.exit(1);
    }

    const client = new OpenAIClient(apiKey);
    const agent = new ChatAgent(client);
    const history = [];

    console.log(chalk.blue('DevCode CLI Chat - Type "exit" to quit'));

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
        await agent.run(response.userInput, history, (token) => {
          process.stdout.write(token);
          fullResponse += token;
        });
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
      }
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
