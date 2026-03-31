const chalk = require('chalk');
const readline = require('readline');
const prompts = require('prompts');
const ChatAgent = require('../agents/chat_agent');
const { loadConfig } = require('../utils/config');
const { formatMarkdown } = require('../utils/formatter');
const { handleInChatCommand } = require('../utils/command_handler');
const { getRepoStructure } = require('../utils/repo_explorer');

async function handleChat(client, cmd, checkDoubleTapExit) {
  const config = loadConfig();
  const provider = cmd.provider || config.provider || 'openai';
  const model = cmd.model || config.model || (provider === 'openai' ? 'gpt-4o' : null);
  const sessionId = Math.random().toString(36).substring(2, 15);
  const agent = new ChatAgent(client);
  const history = [];

  console.log(chalk.blue(`DevCode CLI Chat (${provider}${model ? ': ' + model : ''})`));
  console.log(chalk.gray('Type "/quit" to exit, "/select" to change model, "/install" to add models\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 100
  });

  let isBotStreaming = false;
  let isInterrupted = false;

  rl.on('SIGINT', () => {
    if (isBotStreaming) {
      isInterrupted = true;
      process.stdout.write(chalk.yellow('\n\n[Response Interrupted]\n'));
    } else {
      checkDoubleTapExit();
    }
  });

  while (true) {
    let input;
    try {
      input = await new Promise((resolve) => {
        rl.question(chalk.green('> '), (answer) => {
          resolve(answer.trim());
        });
      });
    } catch (e) {
      break;
    }

    if (!input) continue;
    const handled = await handleInChatCommand(input, client, rl);
    if (handled) continue;

    let fullResponse = '';
    let lastLineCount = 0;
    let currentPlan = null;
    isBotStreaming = true;
    isInterrupted = false;

    process.stdout.write(chalk.cyan('Bot: '));

    try {
      const activeProvider = (loadConfig()).provider || provider;
      const activeModel = (loadConfig()).model || model;
      const repoStructure = getRepoStructure(process.cwd());

      await agent.run(input, history, (data) => {
        if (isInterrupted) return;

        if (data.type === 'plan') {
          currentPlan = data.steps;
          process.stdout.write(chalk.yellow('\n\nImplementation Plan Generated:\n'));
          currentPlan.forEach(s => {
            console.log(chalk.gray(`  - [ ] ${s.description}`));
          });
          return;
        }

        if (data.type === 'chunk') {
          fullResponse += data.content;
          const formatted = formatMarkdown(fullResponse);
          if (lastLineCount > 0) {
            readline.moveCursor(process.stdout, 0, -lastLineCount);
          }
          readline.cursorTo(process.stdout, 5);
          readline.clearScreenDown(process.stdout);
          process.stdout.write(formatted);
          
          const cols = process.stdout.columns || 80;
          const lines = formatted.split('\n');
          let currentLineCount = 0;
          lines.forEach((line, index) => {
            const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
            const effectiveLength = (index === 0) ? cleanLine.length + 5 : cleanLine.length;
            currentLineCount += Math.max(1, Math.ceil(effectiveLength / cols));
          });
          lastLineCount = currentLineCount - 1;
        }
      }, { provider: activeProvider, model: activeModel, repoStructure, basePath: process.cwd(), session_id: sessionId });

      isBotStreaming = false;
      process.stdout.write('\n\n');

      // Approval Loop
      if (currentPlan) {
        rl.pause();
        for (const step of currentPlan) {
          const response = await prompts({
            type: 'select',
            name: 'action',
            message: `Approve step: ${chalk.cyan(step.description)}?`,
            choices: [
              { title: 'Approve & Execute', value: 'approve' },
              { title: 'Skip', value: 'skip' },
              { title: 'Abort Plan', value: 'abort' }
            ]
          });

          if (response.action === 'abort') break;
          if (response.action === 'skip') continue;
          if (response.action === 'approve') {
            console.log(chalk.blue(`Executing: ${step.file_path}...`));
            const result = await client.approveStep(sessionId, step.id, process.cwd(), {
              provider: (loadConfig()).provider || provider,
              model: (loadConfig()).model || model,
              repoStructure: getRepoStructure(process.cwd())
            });

            if (result.status === 'success') {
              console.log(chalk.green('✔ Done.'));
              if (result.code) {
                console.log(chalk.gray('--- Changes ---'));
                const preview = result.code.split('\n').slice(0, 10).join('\n');
                console.log(chalk.cyan(preview) + (result.code.split('\n').length > 10 ? '\n...' : ''));
                console.log(chalk.gray('---------------'));
              }
            } else {
              console.log(chalk.red(`✘ Failed: ${result.message}`));
            }
          }
        }
        rl.resume();
        // Final Summary
        console.log(chalk.blue('\nAll steps processed. Summary:'));
        await agent.run("Summarize the changes made in this session.", history, (data) => {
          if (data.type === 'chunk') process.stdout.write(data.content);
        }, { session_id: sessionId });
        process.stdout.write('\n\n');
      }

      if (fullResponse) {
        history.push({ role: 'user', content: input });
        history.push({ role: 'assistant', content: fullResponse });
      }
    } catch (error) {
      console.error(chalk.red('\nError: ' + error.message));
      isBotStreaming = false;
    }
  }
}

module.exports = { handleChat };
