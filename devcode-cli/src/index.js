#!/usr/bin/env node
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
const { startBackend } = require('./utils/backend_manager');

const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const client = new BackendClient();

program
  .name('devcode')
  .description('A CLI tool for AI-powered coding assistance')
  .version(packageJson.version)
  .action(async (cmd) => {
    // This is for when 'devcode' is run without any subcommands
    await startBackend();
    await handleChat(client, cmd);
  });

program
  .command('chat', { isDefault: true })
  .description('Start an interactive chat with the AI (Default)')
  .option('-p, --provider <provider>', 'AI provider to use (openai or ollama)')
  .option('-m, --model <model>', 'Specific model to use')
  .option('-b, --boost', 'Boost mode: skip all approvals', false)
  .action(async (cmd) => {
    await startBackend();
    await handleChat(client, cmd);
  });

program
  .command('install [model]')
  .description('Install an Ollama model')
  .action(async (model) => {
    await startBackend();
    await handleInstall(client, model);
  });

program
  .command('select')
  .description('Select provider and model')
  .action(async () => {
    await handleSelect(client);
  });

program.parse(process.argv);
