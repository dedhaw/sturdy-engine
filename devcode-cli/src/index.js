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

const client = new BackendClient('http://localhost:8040');

// Shared state for Ctrl+C
let lastCtrlC = 0;

function checkDoubleTapExit() {
  const now = Date.now();
  if (now - lastCtrlC < 1000) {
    console.log(chalk.blue('\nExiting DevCode...'));
    process.exit(0);
  }
  lastCtrlC = now;
  console.log(chalk.gray('\nPress Ctrl+C again to exit'));
}

// Global handler for when NOT in a prompt
process.on('SIGINT', () => {
  checkDoubleTapExit();
});

async function handleInstall(modelName) {
  if (!modelName) {
    console.log(chalk.yellow('\nAvailable models to install:'));
    try {
      const { models } = await client.getAvailableModels();
      models.forEach(m => {
        console.log(`${chalk.green(m.name.padEnd(20))} - ${m.description}`);
      });
      console.log(chalk.gray('\nRun: devcode install <model-name> or /install <model-name> in chat\n'));
    } catch (e) {
      console.error(chalk.red('Error fetching available models: ' + e.message));
    }
    return;
  }

  console.log(chalk.blue(`\nInstalling model: ${modelName}...`));
  try {
    let lastStatus = '';
    await client.installModel(modelName, (data) => {
      if (data.status && data.status !== lastStatus) {
        process.stdout.write(`\n${chalk.cyan('Status:')} ${data.status}`);
        lastStatus = data.status;
      }
      if (data.completed && data.total) {
        const percent = Math.round((data.completed / data.total) * 100);
        process.stdout.write(`\r${chalk.cyan('Progress:')} ${percent}%`);
      }
    });
    console.log(chalk.green(`\n\nSuccessfully installed ${modelName}!\n`));
  } catch (error) {
    console.error(chalk.red('\nInstallation failed: ' + error.message));
  }
}

program
  .name('devcode')
  .description('A CLI tool for AI-powered coding assistance')
  .version(packageJson.version);

program
  .command('install [model]')
  .description('Install an Ollama model')
  .action(async (model) => {
    await handleInstall(model);
  });

program
  .command('chat')
  .description('Start an interactive chat with the AI')
  .option('-p, --provider <provider>', 'AI provider to use (openai or ollama)', 'openai')
  .option('-m, --model <model>', 'Specific model to use')
  .action(async (cmd) => {
    const { provider, model } = cmd;
    const agent = new ChatAgent(client);
    const history = [];

    console.log(chalk.blue(`DevCode CLI Chat (${provider}${model ? ': ' + model : ''}) - Type "exit" to quit`));

    while (true) {
      let response;
      try {
        response = await prompts({
          type: 'text',
          name: 'userInput',
          message: chalk.green('>'),
        }, {
          // This explicitly handles Ctrl+C inside the prompt
          onCancel: () => {
            checkDoubleTapExit();
            return false; 
          }
        });
      } catch (e) {
        break;
      }

      // If user pressed Ctrl+C, response will be empty/undefined due to onCancel: false
      if (!response || response.userInput === undefined) {
        continue;
      }
      
      const input = response.userInput.trim();
      if (!input) continue;
      
      if (input.toLowerCase() === 'exit') {
        console.log(chalk.blue('Goodbye!'));
        break;
      }

      // Handle /install command in chat
      if (input.startsWith('/install')) {
        const parts = input.split(' ');
        const modelToInstall = parts[1];
        await handleInstall(modelToInstall);
        continue;
      }

      process.stdout.write(chalk.cyan('Bot: '));
      
      let fullResponse = '';
      try {
        await agent.run(input, history, (token) => {
          process.stdout.write(token);
          fullResponse += token;
        }, { provider, model });
        
        process.stdout.write('\n');
        
        // Add to history
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
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
