const chalk = require('chalk');

function formatMarkdown(text) {
  if (!text) return '';

  let formatted = text;

  // 1. Code blocks (```code```)
  // We use a more careful regex to handle partial blocks while streaming
  formatted = formatted.replace(/```([a-zA-Z0-9-]*)\n?([\s\S]*?)(```|$)/g, (match, lang, code, end) => {
    const border = chalk.gray('─'.repeat(Math.min(process.stdout.columns || 40, 60)));
    const header = lang ? chalk.yellow(` code: ${lang} `) : chalk.yellow(' code ');
    const isFinished = end === '```';
    
    return `\n${border}\n${header}\n${chalk.cyan(code.trim())}${isFinished ? `\n${border}\n` : '\n'}`;
  });

  // 2. Inline code (`code`)
  formatted = formatted.replace(/`([^`\n]+)`/g, (match, code) => {
    return chalk.bgGray.white(` ${code} `);
  });

  // 3. Bold (**bold**)
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (match, bold) => {
    return chalk.bold.yellow(bold);
  });

  // 4. Italic (*italic*)
  formatted = formatted.replace(/\*([^*]+)\*/g, (match, italic) => {
    return chalk.italic(italic);
  });

  // 5. Headers (# Header)
  formatted = formatted.replace(/^(#+)\s+(.+)$/gm, (match, hashes, title) => {
    const level = hashes.length;
    if (level === 1) return chalk.bold.magenta.underline(title);
    if (level === 2) return chalk.bold.magenta(title);
    return chalk.bold.cyan(title);
  });

  // 6. Lists (* item or - item)
  formatted = formatted.replace(/^(\s*)[*-]\s+(.+)$/gm, (match, space, content) => {
    return `${space}${chalk.yellow('•')} ${content}`;
  });

  return formatted;
}

module.exports = { formatMarkdown };
