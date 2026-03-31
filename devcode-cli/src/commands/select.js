const chalk = require('chalk');
const prompts = require('prompts');
const { saveConfig } = require('../utils/config');

async function handleSelect(client) {
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

module.exports = { handleSelect };
