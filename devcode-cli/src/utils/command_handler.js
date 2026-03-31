const chalk = require('chalk');
const { loadConfig } = require('./config');
const { handleSelect } = require('../commands/select');
const { handleInstall } = require('../commands/install');

async function handleInChatCommand(input, client, rl, context = {}) {
  const lowercaseInput = input.toLowerCase();

  if (lowercaseInput === '/quit') {
    console.log(chalk.blue('Goodbye!'));
    process.exit(0);
  }

  if (lowercaseInput.startsWith('/select')) {
    await handleSelect(client);
    const newConfig = loadConfig();
    console.log(chalk.blue(`Switched to: ${newConfig.provider} (${newConfig.model})`));
    return true;
  }

  if (lowercaseInput.startsWith('/install')) {
    const parts = input.split(' ');
    const modelToInstall = parts[1];
    await handleInstall(client, modelToInstall);
    return true;
  }

  if (lowercaseInput === '/help') {
    console.log(chalk.yellow('\nAvailable Commands:'));
    console.log(chalk.cyan('  /quit    ') + '- Exit the chat session');
    console.log(chalk.cyan('  /select  ') + '- Interactively switch between models and providers');
    console.log(chalk.cyan('  /install ') + '- Install a specific local model (Ollama)');
    console.log(chalk.cyan('  /boost   ') + '- Toggle Boost Mode (skip all approvals)');
    console.log(chalk.cyan('  /clear   ') + '- Clear the terminal screen');
    console.log(chalk.cyan('  /help    ') + '- Show this list of commands\n');
    return true;
  }

  if (lowercaseInput === '/boost') {
    context.boost = !context.boost;
    console.log(chalk.bold.yellow(`\nBoost Mode ${context.boost ? 'ENABLED 🚀' : 'DISABLED'}`));
    return true;
  }

  if (lowercaseInput === '/clear') {
    console.clear();
    return true;
  }

  if (input.startsWith('/')) {
    console.log(chalk.yellow(`Unknown command: ${input}`));
    return true;
  }

  return false;
}

module.exports = { handleInChatCommand };
