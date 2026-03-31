const chalk = require('chalk');
const { intro, outro, spinner, isCancel, note, log, select: clackSelect, text: clackText } = require('@clack/prompts');
const { AutoComplete } = require('enquirer');
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

  console.clear();
  intro(chalk.bold.white.bgBlue('  DEVCODE CLI  '));
  log.info(`${chalk.gray('Mode:')} ${chalk.cyan(provider)} ${chalk.gray('|')} ${chalk.blue(model || 'default')}`);
  log.info(chalk.gray('Type your message or use / for commands.\n'));

  while (true) {
    const input = await clackText({
      message: chalk.cyan('❯'),
      placeholder: 'Type a message or / for commands...',
      validate: (value) => {
        if (!value) return 'Please enter a message';
      }
    });

    if (isCancel(input)) {
      outro(chalk.blue('Goodbye!'));
      process.exit(0);
    }

    let finalInput = input.trim();

    const knownCommands = ['/help', '/select', '/install', '/clear', '/quit'];
    if (finalInput === '/' || (finalInput.startsWith('/') && !knownCommands.includes(finalInput))) {
      try {
        const prompt = new AutoComplete({
          name: 'command',
          message: chalk.yellow('Execute Command'),
          choices: [
            { name: '/help', message: 'help    - Show available commands', value: '/help' },
            { name: '/select', message: 'select  - Change model or provider', value: '/select' },
            { name: '/install', message: 'install - Install a local model', value: '/install' },
            { name: '/clear', message: 'clear   - Clear terminal', value: '/clear' },
            { name: '/quit', message: 'quit    - Exit session', value: '/quit' }
          ],
          initial: finalInput,
          suggest(input, choices) {
            const needle = input.toLowerCase();
            return choices.filter(c => c.name.toLowerCase().startsWith(needle));
          }
        });

        const selected = await prompt.run();
        if (selected) {
          finalInput = selected;
        } else {
          continue;
        }
      } catch (e) {
        continue;
      }
    }

    const mockRl = { 
        close: () => {}, pause: () => {}, resume: () => {},
        setPrompt: () => {}, prompt: () => {}
    };
    
    const handled = await handleInChatCommand(finalInput, client, mockRl);
    if (handled) continue;

    let fullResponse = '';
    let currentPlan = null;
    const modifiedFiles = new Map();
    const s = spinner();
    s.start('Thinking...');

    try {
      const activeProvider = (loadConfig()).provider || provider;
      const activeModel = (loadConfig()).model || model;
      const repoStructure = getRepoStructure(process.cwd());

      await agent.run(finalInput, history, (data) => {
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
            console.log();
            process.stdout.write(chalk.blue('┌  ') + chalk.bold('Assistant') + '\n');
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

      // Ensure the initial spinner is stopped before moving on
      s.stop('Thinking complete');

      if (fullResponse) {
        process.stdout.write('\n' + chalk.blue('└') + '─'.repeat(50) + '\n\n');
        history.push({ role: 'user', content: finalInput });
        history.push({ role: 'assistant', content: fullResponse });
      }

      // Approval Loop
      if (currentPlan) {
        for (const step of currentPlan) {
          const action = await clackSelect({
            message: `Approve step: ${chalk.cyan(step.description)}?`,
            options: [
              { value: 'approve', label: 'Approve & Execute' },
              { value: 'skip', label: 'Skip' },
              { value: 'abort', label: 'Abort Plan' }
            ]
          });

          if (isCancel(action) || action === 'abort') break;
          if (action === 'skip') continue;

          if (action === 'approve') {
            const filePath = step.file_path || (step.metadata && step.metadata.file_path);
            const execSpinner = spinner();
            execSpinner.start(`Implementing changes in ${chalk.blue(filePath)}...`);
            
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

        // Final Summary
        log.step('Finalizing session...');
        const summarySpinner = spinner();
        summarySpinner.start('Summarizing changes...');
        let summaryResponse = '';
        
        await agent.run("Summarize the changes made in this session.", history, (data) => {
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
        }, { session_id: sessionId });
        
        // Ensure the summary spinner is stopped
        summarySpinner.stop('Summary complete');
        process.stdout.write('\n' + chalk.blue('└') + '─'.repeat(50) + '\n\n');

        if (modifiedFiles.size > 0) {
          console.log('\n' + chalk.bold.white.bgBlue('  REVIEW CHANGES  ') + '\n');
          for (const [path, data] of modifiedFiles) {
            const isNew = !data.diff || data.diff.trim() === '';
            const headerText = isNew ? `[NEW FILE] ${path}` : `[MODIFIED] ${path}`;
            
            console.log(chalk.bold.blue(headerText));
            console.log(chalk.gray('─'.repeat(headerText.length)));
            
            let displayCode = data.diff;
            if (isNew) {
                // For new files, prepend '+' to each line to make it look like a diff
                displayCode = data.code.split('\n').map(l => '+' + l).join('\n');
            }
            
            // Print the code without any extra indent bars
            console.log(formatMarkdown(`\`\`\`diff\n${displayCode}\n\`\`\``));
            console.log(); // Add spacing between files
          }
          console.log(chalk.bold.blue('─'.repeat(process.stdout.columns || 50)) + '\n');
        }
      }
    } catch (error) {
      s.stop(chalk.red('Error occurred'));
      log.error(error.message);
    }
  }
}

module.exports = { handleChat };
