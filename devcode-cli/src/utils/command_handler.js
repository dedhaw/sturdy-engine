const chalk = require('chalk');
const { loadConfig } = require('./config');
const { handleSelect } = require('../commands/select');
const { handleInstall } = require('../commands/install');

async function handleInChatCommand(input, client, rl) {
  const lowercaseInput = input.toLowerCase();

  if (lowercaseInput === '/quit') {
    console.log(chalk.blue('Goodbye!'));
    rl.close();
    process.exit(0);
  }

  if (lowercaseInput.startsWith('/select')) {
    rl.pause();
    await handleSelect(client);
    rl.resume();
    const newConfig = loadConfig();
    console.log(chalk.blue(`Switched to: ${newConfig.provider} (${newConfig.model})`));
    return true;
  }

  if (lowercaseInput.startsWith('/install')) {
    const parts = input.split(' ');
    const modelToInstall = parts[1];
    rl.pause();
    await handleInstall(client, modelToInstall);
    rl.resume();
    return true;
  }

  if (input.startsWith('/')) {
    console.log(chalk.yellow(`Unknown command: ${input}`));
    return true;
  }

  return false;
}

module.exports = { handleInChatCommand };
