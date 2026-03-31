const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, processEnv: process.env });
}

const BackendClient = require('./api_clients/backend_client');
const { handleInstall } = require('./commands/install');
const { handleSelect } = require('./commands/select');
const { handleChat } = require('./commands/chat');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const client = new BackendClient();

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

process.on('SIGINT', () => {
  checkDoubleTapExit();
});

program
  .name('devcode')
  .description('A CLI tool for AI-powered coding assistance')
  .version(packageJson.version);

program
  .command('install [model]')
  .description('Install an Ollama model')
  .action(async (model) => {
    await handleInstall(client, model);
  });

program
  .command('select')
  .description('Select provider and model')
  .action(async () => {
    await handleSelect(client);
  });

program
  .command('chat')
  .description('Start an interactive chat with the AI')
  .option('-p, --provider <provider>', 'AI provider to use (openai or ollama)')
  .option('-m, --model <model>', 'Specific model to use')
  .action(async (cmd) => {
    await handleChat(client, cmd, checkDoubleTapExit);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
