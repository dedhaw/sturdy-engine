const chalk = require('chalk');
const { spinner, note, log } = require('@clack/prompts');
const { AutoComplete } = require('enquirer');

async function handleInstall(client, modelName, rl) {
  let finalModelToInstall = modelName;

  rl.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);

  try {
    if (!finalModelToInstall) {
      const s = spinner();
      s.start('Fetching available models from Ollama Library...');
      const { models } = await client.getAvailableModels();
      s.stop('Catalog fetched');
      
      if (!models || models.length === 0) {
        note('No models found in catalog.', 'Notice');
        return;
      }

      const baseModelPrompt = new AutoComplete({
        name: 'model',
        message: chalk.cyan('Search base model'),
        choices: models.map(m => ({
          name: m.name,
          message: `${chalk.bold(m.name.padEnd(20))} - ${m.description}`,
          value: m.name
        })),
        limit: 10,
        footer: chalk.gray('(Type to filter, Use arrow keys to select)')
      });

      const baseModel = await baseModelPrompt.run();
      if (!baseModel) return;

      const tagSpinner = spinner();
      tagSpinner.start(`Fetching available versions for ${baseModel}...`);
      const { tags } = await client.getModelTags(baseModel);
      tagSpinner.stop('Versions fetched');

      if (!tags || tags.length === 0) {
        finalModelToInstall = `${baseModel}:latest`;
      } else {
        const tagPrompt = new AutoComplete({
          name: 'tag',
          message: `Select version for ${chalk.cyan(baseModel)}`,
          choices: tags.map(t => ({
            name: t.full_name,
            message: `${t.name.padEnd(15)} (${t.size || 'unknown size'})`,
            value: t.full_name
          })),
          limit: 15,
          footer: chalk.gray('(Type parameter size e.g. "14b" to filter)')
        });

        const selectedTag = await tagPrompt.run();
        if (!selectedTag) return;
        finalModelToInstall = selectedTag;
      }
    }

    const installSpinner = spinner();
    installSpinner.start(`Installing model: ${finalModelToInstall}...`);
    
    try {
      let lastStatus = '';
      let hasError = false;
      let errorMessage = '';

      await client.installModel(finalModelToInstall, (data) => {
        if (data.status === 'error') {
          hasError = true;
          errorMessage = data.message || 'Unknown error';
          return;
        }

        if (data.status && data.status !== lastStatus) {
          installSpinner.message(`Status: ${data.status}`);
          lastStatus = data.status;
        }
        if (data.completed && data.total) {
          const percent = Math.round((data.completed / data.total) * 100);
          installSpinner.message(`Progress: ${percent}% (${data.status})`);
        }
      });

      if (hasError) {
        installSpinner.stop(`Failed to install ${finalModelToInstall}: ${errorMessage}`, 1);
      } else {
        installSpinner.stop(`Successfully installed ${finalModelToInstall}!`);
      }
    } catch (error) {
      installSpinner.stop('Installation failed', 1);
      console.error(chalk.red('\n' + error.message));
    }
  } catch (err) {
  } finally {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    rl.resume();
  }
}

module.exports = { handleInstall };
