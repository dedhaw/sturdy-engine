const chalk = require('chalk');

function formatMarkdown(text) {
  if (!text) return '';

  let formatted = text;

  // 1. Code blocks (```code```)
  formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
    const lines = code.trim().split('\n');
    let lang = '';
    let codeContent = code;
    
    // Check if first line is a language identifier
    if (lines.length > 0 && !lines[0].includes(' ') && lines[0].length < 20) {
      lang = lines[0];
      codeContent = lines.slice(1).join('\n');
    }
    
    const border = chalk.gray('─'.repeat(Math.min(process.stdout.columns || 40, 60)));
    const header = lang ? chalk.yellow(` code: ${lang} `) : chalk.yellow(' code ');
    
    return `\n${border}\n${header}\n${chalk.cyan(codeContent.trim())}\n${border}\n`;
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
    if (level === 1) return chalk.bold.magenta.underline(`\n${title}\n`);
    if (level === 2) return chalk.bold.magenta(`\n${title}\n`);
    return chalk.bold.cyan(`\n${title}\n`);
  });

  // 6. Lists (* item or - item)
  formatted = formatted.replace(/^(\s*)[*-]\s+(.+)$/gm, (match, space, content) => {
    return `${space}${chalk.yellow('•')} ${content}`;
  });

  return formatted;
}

module.exports = { formatMarkdown };
