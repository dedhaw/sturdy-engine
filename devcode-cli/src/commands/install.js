const chalk = require('chalk');
const { select, isCancel, spinner, note, log } = require('@clack/prompts');

async function handleInstall(client, modelName, rl) {
  let selectedModel = modelName;

  // Pause the main chat RL to let Clack take over the stream
  rl.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);

  try {
    if (!selectedModel) {
      const s = spinner();
      s.start('Fetching available models from catalog...');
      try {
        const { models } = await client.getAvailableModels();
        s.stop('Catalog fetched');
        
        if (!models || models.length === 0) {
          note('No models found in catalog.', 'Notice');
          return;
        }

        selectedModel = await select({
          message: 'Select a model to install',
          options: models.map(m => ({
            label: `${m.name.padEnd(20)} - ${m.description}`,
            value: m.name
          }))
        });

        if (isCancel(selectedModel)) return;
      } catch (e) {
        s.stop('Error fetching models', 1);
        console.error(chalk.red('Error: ' + e.message));
        return;
      }
    }

    const installSpinner = spinner();
    installSpinner.start(`Installing model: ${selectedModel}...`);
    
    try {
      let lastStatus = '';
      let hasError = false;
      let errorMessage = '';

      await client.installModel(selectedModel, (data) => {
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
        installSpinner.stop(`Failed to install ${selectedModel}: ${errorMessage}`, 1);
      } else {
        installSpinner.stop(`Successfully installed ${selectedModel}!`);
      }
    } catch (error) {
      installSpinner.stop('Installation failed', 1);
      console.error(chalk.red('\n' + error.message));
    }
  } finally {
    // Restore the main chat RL and raw mode
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    rl.resume();
  }
}

module.exports = { handleInstall };
