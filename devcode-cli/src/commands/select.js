const chalk = require('chalk');
const { select, isCancel, spinner, note } = require('@clack/prompts');
const { saveConfig } = require('../utils/config');

async function handleSelect(client, rl) {
  // Pause the main chat RL to let Clack take over the stream
  rl.pause();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);

  try {
    const provider = await select({
      message: 'Choose AI Provider',
      options: [
        { label: 'OpenAI (Cloud)', value: 'openai' },
        { label: 'Ollama (Local)', value: 'ollama' }
      ]
    });

    if (isCancel(provider)) return;

    let model;
    if (provider === 'ollama') {
      const s = spinner();
      s.start('Fetching installed local models...');
      try {
        const { models } = await client.getInstalledModels();
        s.stop('Local models fetched');
        
        if (!models || models.length === 0) {
          note('No Ollama models installed. Use "/install" first.', 'Notice');
          return;
        }
        
        model = await select({
          message: 'Choose Ollama Model',
          options: models.map(m => ({ label: m.name, value: m.name })),
        });
      } catch (e) {
        s.stop('Error fetching models', 1);
        console.error(chalk.red('Error: ' + e.message));
        return;
      }
    } else {
      model = await select({
        message: 'Choose OpenAI Model',
        options: [
          { label: 'GPT-4o (High quality)', value: 'gpt-4o' },
          { label: 'GPT-4o mini (Fast & Cheap)', value: 'gpt-4o-mini' },
          { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' }
        ]
      });
    }

    if (isCancel(model)) return;

    if (model) {
      saveConfig({ provider, model });
      note(`${chalk.bold(provider)} using ${chalk.bold(model)}`, 'Selection Saved');
    }
  } finally {
    // Restore the main chat RL and raw mode
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    rl.resume();
  }
}

module.exports = { handleSelect };
