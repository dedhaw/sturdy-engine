#!/usr/bin/env node

const { program } = require('commander');
const prompts = require('prompts');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BackendClient = require('./api_clients/backend_client');
const ChatAgent = require('./agents/chat_agent');
const { loadConfig, saveConfig } = require('./utils/config');
const { formatMarkdown } = require('./utils/formatter');

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
  let selectedModel = modelName;

  if (!selectedModel) {
    console.log(chalk.blue('\nFetching available models from catalog...'));
    try {
      const { models } = await client.getAvailableModels();
      if (!models || models.length === 0) {
        console.log(chalk.yellow('No models found in catalog.'));
        return;
      }

      const response = await prompts({
        type: 'select',
        name: 'model',
        message: 'Select a model to install',
        choices: models.map(m => ({
          title: `${chalk.green(m.name.padEnd(20))} - ${m.description}`,
          value: m.name
        })),
        initial: 0
      });

      if (!response.model) return;
      selectedModel = response.model;
    } catch (e) {
      console.error(chalk.red('Error fetching available models: ' + e.message));
      return;
    }
  }

  console.log(chalk.blue(`\nInstalling model: ${selectedModel}...`));
  try {
    let lastStatus = '';
    let hasError = false;
    let errorMessage = '';

    await client.installModel(selectedModel, (data) => {
      if (data.status === 'error') {
        hasError = true;
        errorMessage = data.message || 'Unknown error';
        process.stdout.write(`\n${chalk.red('Error:')} ${errorMessage}`);
        return;
      }

      if (data.status && data.status !== lastStatus) {
        process.stdout.write(`\n${chalk.cyan('Status:')} ${data.status}`);
        lastStatus = data.status;
      }
      if (data.completed && data.total) {
        const percent = Math.round((data.completed / data.total) * 100);
        process.stdout.write(`\r${chalk.cyan('Progress:')} ${percent}%`);
      }
    });

    if (hasError) {
      console.log(chalk.red(`\n\nFailed to install ${selectedModel}.`));
    } else {
      console.log(chalk.green(`\n\nSuccessfully installed ${selectedModel}!\n`));
    }
  } catch (error) {
    console.error(chalk.red('\nInstallation failed: ' + error.message));
  }
}

async function handleSelect() {
  const response = await prompts([
    {
      type: 'select',
      name: 'provider',
      message: 'Choose AI Provider',
      choices: [
        { title: 'OpenAI (Cloud)', value: 'openai' },
        { title: 'Ollama (Local)', value: 'ollama' }
      ],
      initial: 0
    }
  ]);

  if (!response.provider) return;

  let model;
  if (response.provider === 'ollama') {
    console.log(chalk.blue('\nFetching installed local models...'));
    try {
      const { models } = await client.getInstalledModels();
      if (!models || models.length === 0) {
        console.log(chalk.yellow('No Ollama models installed. Use "devcode install" first.'));
        return;
      }
      
      const modelResponse = await prompts({
        type: 'select',
        name: 'model',
        message: 'Choose Ollama Model',
        choices: models.map(m => ({ title: m.name, value: m.name })),
      });
      model = modelResponse.model;
    } catch (e) {
      console.error(chalk.red('Error fetching local models: ' + e.message));
      return;
    }
  } else {
    const modelResponse = await prompts({
      type: 'select',
      name: 'model',
      message: 'Choose OpenAI Model',
      choices: [
        { title: 'GPT-4o (High quality)', value: 'gpt-4o' },
        { title: 'GPT-4o mini (Fast & Cheap)', value: 'gpt-4o-mini' },
        { title: 'GPT-4 Turbo', value: 'gpt-4-turbo' }
      ],
      initial: 0
    });
    model = modelResponse.model;
  }

  if (model) {
    saveConfig({ provider: response.provider, model });
    console.log(chalk.green(`\nSelection saved: ${chalk.bold(response.provider)} using ${chalk.bold(model)}\n`));
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
  .command('select')
  .description('Select provider and model')
  .action(async () => {
    await handleSelect();
  });

program
  .command('chat')
  .description('Start an interactive chat with the AI')
  .option('-p, --provider <provider>', 'AI provider to use (openai or ollama)')
  .option('-m, --model <model>', 'Specific model to use')
  .action(async (cmd) => {
    const config = loadConfig();
    const provider = cmd.provider || config.provider || 'openai';
    const model = cmd.model || config.model || (provider === 'openai' ? 'gpt-4o' : null);
    
    const agent = new ChatAgent(client);
    const history = [];

    console.log(chalk.blue(`DevCode CLI Chat (${provider}${model ? ': ' + model : ''})`));
    console.log(chalk.gray('Type "exit" to quit, "/select" to change model, "/install" to add models\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 100
    });

    // Custom SIGINT for readline
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
      
      if (input.toLowerCase() === 'exit') {
        console.log(chalk.blue('Goodbye!'));
        rl.close();
        break;
      }

      // Handle /select command in chat
      if (input.startsWith('/select')) {
        rl.pause();
        await handleSelect();
        rl.resume();
        const newConfig = loadConfig();
        console.log(chalk.blue(`Switched to: ${newConfig.provider} (${newConfig.model})`));
        continue;
      }

      // Handle /install command in chat
      if (input.startsWith('/install')) {
        const parts = input.split(' ');
        const modelToInstall = parts[1];
        rl.pause();
        await handleInstall(modelToInstall);
        rl.resume();
        continue;
      }

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
          
          // 1. Move cursor back to the start of the bot response
          if (lastLineCount > 0) {
            readline.moveCursor(process.stdout, 0, -lastLineCount);
          }
          // Move to column 5 (length of "Bot: ")
          readline.cursorTo(process.stdout, 5);
          // Clear everything from the cursor down
          readline.clearScreenDown(process.stdout);
          
          // 2. Print the new formatted content
          process.stdout.write(formatted);
          
          // 3. Calculate how many lines the new content takes
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
