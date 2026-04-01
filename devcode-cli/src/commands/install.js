const chalk = require('chalk');
const { select, isCancel, spinner, note, log } = require('@clack/prompts');

async function handleInstall(client, modelName, rl) {
  let finalModelToInstall = modelName;

  rl.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);

  try {
    if (!finalModelToInstall) {
      // Step 1: Pick the base model
      const s = spinner();
      s.start('Fetching available models from Ollama Library...');
      const { models } = await client.getAvailableModels();
      s.stop('Catalog fetched');
      
      if (!models || models.length === 0) {
        note('No models found in catalog.', 'Notice');
        return;
      }

      const baseModel = await select({
        message: 'Select a base model',
        options: models.map(m => ({
          label: `${m.name.padEnd(20)} [${m.parameters}] - ${m.description}`,
          value: m.name
        }))
      });

      if (isCancel(baseModel)) return;

      // Step 2: Pick the specific tag/version
      const tagSpinner = spinner();
      tagSpinner.start(`Fetching available versions for ${baseModel}...`);
      const { tags } = await client.getModelTags(baseModel);
      tagSpinner.stop('Versions fetched');

      if (!tags || tags.length === 0) {
        // Fallback to 'latest' if no tags found or error
        finalModelToInstall = `${baseModel}:latest`;
      } else {
        const selectedTag = await select({
          message: `Select version for ${chalk.cyan(baseModel)}`,
          options: tags.map(t => ({
            label: `${t.name.padEnd(15)} (${t.size || 'unknown size'})`,
            value: t.full_name
          }))
        });

        if (isCancel(selectedTag)) return;
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
  } finally {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    rl.resume();
  }
}

module.exports = { handleInstall };
