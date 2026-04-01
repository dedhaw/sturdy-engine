const chalk = require('chalk');
const readline = require('readline');
const { intro, outro, spinner, isCancel, note, log, select: clackSelect } = require('@clack/prompts');
const prompts = require('prompts');
const ChatAgent = require('../agents/chat_agent');
const { loadConfig } = require('../utils/config');
const { formatMarkdown } = require('../utils/formatter');
const { handleInChatCommand } = require('../utils/command_handler');
const { getRepoStructure } = require('../utils/repo_explorer');

async function handleChat(client, cmd) {
  const config = loadConfig();
  const provider = cmd.provider || config.provider || 'openai';
  const model = cmd.model || config.model || (provider === 'openai' ? 'gpt-4o' : null);
  const sessionId = Math.random().toString(36).substring(2, 15);
  const agent = new ChatAgent(client);
  const history = [];
  const chatContext = { boost: cmd.boost || false };

  const isDev = process.env.APP_MODE === 'dev';
  const debugLog = (msg) => { if (isDev) console.log(chalk.gray(`[DEBUG] ${msg}`)); };

  let isBotStreaming = false;
  let isInterrupted = false;
  let lastCtrlC = 0;
  let isMenuOpen = false;

  console.clear();
  intro(chalk.bold.white.bgBlue('  DEVCODE CLI  '));
  log.info(`${chalk.gray('Mode:')} ${chalk.cyan(provider)} ${chalk.gray('|')} ${chalk.blue(model || 'default')}`);
  if (chatContext.boost) log.warn(chalk.bold.yellow('🚀 Boost Mode is ENABLED'));
  log.info(chalk.gray('Type your message or use / for commands. Up/Down for history.'));
  log.info(chalk.gray('Use /quit to exit.\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 1000,
    prompt: chalk.cyan('❯ ')
  });

  const cleanupAndExit = () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    rl.close();
    process.stdout.write('\n');
    outro(chalk.blue('Goodbye!'));
    process.exit(0);
  };

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  readline.emitKeypressEvents(process.stdin);

  process.stdin.on('keypress', async (char, key) => {
    if (isBotStreaming || isMenuOpen) return;

    if (char === '/' && rl.line.length === 0) {
      isMenuOpen = true;
      rl.pause();
      
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);

      const response = await prompts({
        type: 'select',
        name: 'command',
        message: 'Select a command:',
        choices: [
          { title: '/help    - Show available commands', value: '/help' },
          { title: '/boost   - Toggle auto-approve mode', value: '/boost' },
          { title: '/select  - Change model or provider', value: '/select' },
          { title: '/install - Install a local model', value: '/install' },
          { title: '/clear   - Clear terminal', value: '/clear' },
          { title: '/quit    - Exit session', value: '/quit' },
          { title: 'Cancel', value: '' }
        ]
      });

      readline.moveCursor(process.stdout, 0, -1);
      readline.clearScreenDown(process.stdout);

      isMenuOpen = false;
      rl.resume();

      if (response.command) {
        rl.write(response.command + '\n');
      } else {
        rl.prompt(true);
      }
    }
  });

  rl.on('SIGINT', () => {
    if (isBotStreaming) {
      isInterrupted = true;
      process.stdout.write(chalk.yellow('\n\n[Response Interrupted]\n'));
      return;
    }

    const now = Date.now();
    if (now - lastCtrlC < 1000) {
      cleanupAndExit();
    }
    lastCtrlC = now;
    process.stdout.write(chalk.gray('\nPress Ctrl+C again to exit (or use /quit)\n'));
    rl.prompt(true);
  });

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    const mockRl = { close: cleanupAndExit, pause: () => rl.pause(), resume: () => rl.resume() };
    const handled = await handleInChatCommand(input, client, mockRl, chatContext);
    if (handled) {
      rl.prompt();
      return;
    }

    rl.pause();
    if (process.stdin.isTTY) process.stdin.setRawMode(false);

    let fullResponse = '';
    let currentPlan = null;
    const modifiedFiles = new Map();
    const s = spinner();
    
    isBotStreaming = true;
    isInterrupted = false;
    s.start(chalk.cyan('Thinking'));

    try {
      const activeProvider = (loadConfig()).provider || provider;
      const activeModel = (loadConfig()).model || model;
      const repoStructure = getRepoStructure(process.cwd());

      debugLog(`Calling agent.run with input: "${input}"`);
      await agent.run(input, history, (data) => {
        if (isInterrupted) return;

        if (data.type === 'status') {
          s.message(chalk.cyan(data.content));
        } else if (data.type === 'plan') {
          s.stop(chalk.green('Plan generated'));
          currentPlan = data.steps;
          let planText = '';
          currentPlan.forEach(step => {
            planText += `${chalk.yellow('•')} ${step.description}\n`;
          });
          note(planText.trim(), chalk.bold.yellow('Implementation Plan'));
        } else if (data.type === 'chunk') {
          if (fullResponse === '') {
            s.stop(chalk.green('Response Ready'));
            process.stdout.write('\n' + chalk.blue('┌  ') + chalk.bold('Assistant') + '\n');
            process.stdout.write(chalk.blue('│  '));
          }
          fullResponse += data.content;
          const formatted = data.content.replace(/\n/g, '\n' + chalk.blue('│  '));
          process.stdout.write(formatted);
        }
      }, { 
        provider: activeProvider, 
        model: activeModel, 
        repoStructure, 
        basePath: process.cwd(), 
        session_id: sessionId 
      });

      if (isInterrupted) {
        if (fullResponse === '') s.stop(chalk.yellow('Interrupted'), 1);
        else process.stdout.write('\n' + chalk.blue('│\n└') + chalk.yellow('── [INTERRUPTED]') + '\n\n');
      } else {
        s.stop('Thinking complete');
        if (fullResponse) {
          process.stdout.write('\n' + chalk.blue('└') + '─'.repeat(50) + '\n\n');
          history.push({ role: 'user', content: input });
          history.push({ role: 'assistant', content: fullResponse });
        }
      }
      
      isBotStreaming = false;

      if (currentPlan && !isInterrupted) {
        for (const step of currentPlan) {
          if (isInterrupted) break;
          let action = 'approve';
          
          if (!chatContext.boost) {
            action = await clackSelect({
              message: `Approve step: ${chalk.cyan(step.description)}?`,
              options: [
                { value: 'approve', label: 'Approve & Execute' },
                { value: 'skip', label: 'Skip' },
                { value: 'abort', label: 'Abort Plan' }
              ]
            });
          } else {
            log.step(`${chalk.yellow('Boost:')} Auto-approving ${chalk.cyan(step.description)}`);
          }

          if (isCancel(action) || action === 'abort') break;
          if (action === 'skip') continue;

          if (action === 'approve') {
            const filePath = step.file_path || (step.metadata && step.metadata.file_path);
            const execSpinner = spinner();
            execSpinner.start(`Implementing changes in ${chalk.blue(filePath)}...`);
            
            debugLog(`Executing step: ${step.description}`);
            const result = await client.approveStep(sessionId, step.id, process.cwd(), {
              provider: (loadConfig()).provider || provider,
              model: (loadConfig()).model || model,
              repoStructure: getRepoStructure(process.cwd())
            });

            if (result.status === 'success') {
              execSpinner.stop(chalk.green(`Successfully updated ${filePath}`));
              modifiedFiles.set(filePath, result);
            } else {
              execSpinner.stop(chalk.red(`Failed to update ${filePath}: ${result.message}`));
            }
          }
        }

        if (!isInterrupted) {
            log.step('Finalizing session...');
            const summarySpinner = spinner();
            summarySpinner.start(chalk.cyan('Summarizing changes'));
            let summaryResponse = '';
            isBotStreaming = true;
            
            debugLog('Starting summary agent run');
            await agent.run("Summarize the changes made in this session.", history, (data) => {
              if (isInterrupted) return;
              if (data.type === 'status') {
                summarySpinner.message(chalk.cyan(data.content));
              } else if (data.type === 'chunk') {
                if (summaryResponse === '') {
                  summarySpinner.stop(chalk.green('Summary Ready'));
                  process.stdout.write(chalk.blue('┌  ') + chalk.bold('Session Summary') + '\n');
                  process.stdout.write(chalk.blue('│  '));
                }
                summaryResponse += data.content;
                const formatted = data.content.replace(/\n/g, '\n' + chalk.blue('│  '));
                process.stdout.write(formatted);
              }
            }, { 
              session_id: sessionId,
              provider: (loadConfig()).provider || provider,
              model: (loadConfig()).model || model,
              repoStructure: getRepoStructure(process.cwd()),
              basePath: process.cwd()
            });
            
            if (isInterrupted) {
                if (summaryResponse === '') summarySpinner.stop(chalk.yellow('Interrupted'), 1);
                else process.stdout.write('\n' + chalk.blue('│\n└') + chalk.yellow('── [INTERRUPTED]') + '\n\n');
            } else {
                summarySpinner.stop('Summary complete');
                process.stdout.write('\n' + chalk.blue('└') + '─'.repeat(50) + '\n\n');
            }
            isBotStreaming = false;
        }

        if (modifiedFiles.size > 0 && !isInterrupted) {
          console.log('\n' + chalk.bold.white.bgBlue('  REVIEW CHANGES  ') + '\n');
          for (const [path, data] of modifiedFiles) {
            const isNew = !data.diff || data.diff.trim() === '';
            const headerText = isNew ? `[NEW FILE] ${path}` : `[MODIFIED] ${path}`;
            console.log(chalk.bold.blue(headerText));
            console.log(chalk.gray('─'.repeat(headerText.length)));
            let displayCode = data.diff;
            if (isNew) displayCode = data.code.split('\n').map(l => '+' + l).join('\n');
            console.log(formatMarkdown(`\`\`\`diff\n${displayCode}\n\`\`\``));
            console.log();
          }
          console.log(chalk.bold.blue('─'.repeat(process.stdout.columns || 50)) + '\n');
        }
      }
    } catch (error) {
      s.stop(chalk.red('Error occurred'));
      log.error(error.message);
      isBotStreaming = false;
    } finally {
        isBotStreaming = false;
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        rl.resume();
        rl.prompt();
    }
  });

  rl.prompt();
}

module.exports = { handleChat };
