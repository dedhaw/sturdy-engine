const chalk = require('chalk');

function formatMarkdown(text) {
  if (!text) return '';

  let formatted = text;

  formatted = formatted.replace(/```([a-zA-Z0-9-]*)\n?([\s\S]*?)(```|$)/g, (match, lang, code, end) => {
    const border = chalk.gray('─'.repeat(Math.min(process.stdout.columns || 40, 60)));
    const header = lang ? chalk.yellow(` code: ${lang} `) : chalk.yellow(' code ');
    const isFinished = end === '```';
    
    let highlightedCode = code.trim();
    if (lang === 'diff') {
      highlightedCode = highlightedCode.split('\n').map(line => {
        if (line.startsWith('+')) {
          return chalk.greenBright.bold(line);
        }
        if (line.startsWith('-')) {
          return chalk.redBright.bold(line);
        }
        if (line.startsWith('@@')) {
          return chalk.cyanBright(line);
        }
        if (line.startsWith('---') || line.startsWith('+++')) {
          return chalk.gray(line);
        }
        return line;
      }).join('\n');
    } else {
      highlightedCode = chalk.cyan(highlightedCode);
    }
    
    return `\n${border}\n${header}\n${highlightedCode}${isFinished ? `\n${border}\n` : '\n'}`;
  });

  formatted = formatted.replace(/`([^`\n]+)`/g, (match, code) => {
    return chalk.bgGray.white(` ${code} `);
  });

  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (match, bold) => {
    return chalk.bold.yellow(bold);
  });

  formatted = formatted.replace(/\*([^*]+)\*/g, (match, italic) => {
    return chalk.italic(italic);
  });

  formatted = formatted.replace(/^(#+)\s+(.+)$/gm, (match, hashes, title) => {
    const level = hashes.length;
    if (level === 1) return chalk.bold.magenta.underline(title);
    if (level === 2) return chalk.bold.magenta(title);
    return chalk.bold.cyan(title);
  });

  formatted = formatted.replace(/^(\s*)[*-]\s+(.+)$/gm, (match, space, content) => {
    return `${space}${chalk.yellow('•')} ${content}`;
  });

  return formatted;
}

module.exports = { formatMarkdown };
