const chalk = require('chalk');
const { select, isCancel, spinner, note, confirm } = require('@clack/prompts');

async function handleUninstall(client, rl) {
  // Pause the main chat RL to let Clack take over the stream
  rl.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);

  try {
    const s = spinner();
    s.start('Fetching installed local models...');
    const { models } = await client.getInstalledModels();
    s.stop('Local models fetched');

    if (!models || models.length === 0) {
      note('No local models found to uninstall.', 'Notice');
      return;
    }

    const modelToUninstall = await select({
      message: 'Select a model to UNINSTALL',
      options: models.map(m => ({ label: m.name, value: m.name }))
    });

    if (isCancel(modelToUninstall)) return;

    const sure = await confirm({
      message: `Are you sure you want to permanently delete ${chalk.bold.red(modelToUninstall)}?`,
      initialValue: false
    });

    if (isCancel(sure) || !sure) return;

    const uninstallSpinner = spinner();
    uninstallSpinner.start(`Uninstalling ${modelToUninstall}...`);
    
    try {
      const result = await client.uninstallModel(modelToUninstall);
      if (result.status === 'success') {
        uninstallSpinner.stop(`Successfully uninstalled ${modelToUninstall}`);
      } else {
        uninstallSpinner.stop(`Failed to uninstall ${modelToUninstall}`, 1);
      }
    } catch (error) {
      uninstallSpinner.stop('Uninstall failed', 1);
      console.error(chalk.red('\n' + error.message));
    }
  } catch (error) {
    console.error(chalk.red('\nError: ' + error.message));
  } finally {
    // Restore the main chat RL and raw mode
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    rl.resume();
  }
}

module.exports = { handleUninstall };
