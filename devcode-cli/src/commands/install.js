const chalk = require('chalk');
const prompts = require('prompts');

async function handleInstall(client, modelName) {
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

module.exports = { handleInstall };
