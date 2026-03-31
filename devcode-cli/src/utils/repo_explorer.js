const fs = require('fs');
const path = require('path');

function getRepoStructure(dir, ignoreList = ['.git', 'node_modules', '.venv', '__pycache__', 'dist', 'build']) {
  let structure = '';

  function traverse(currentDir, indent = '') {
    const files = fs.readdirSync(currentDir);

    files.forEach((file, index) => {
      if (ignoreList.includes(file)) return;

      const filePath = path.join(currentDir, file);
      const isLast = index === files.length - 1;
      const stats = fs.statSync(filePath);

      structure += `${indent}${isLast ? '└── ' : '├── '}${file}\n`;

      if (stats.isDirectory()) {
        traverse(filePath, indent + (isLast ? '    ' : '│   '));
      }
    });
  }

  try {
    const rootName = path.basename(dir);
    structure = `${rootName}/\n`;
    traverse(dir);
    return structure;
  } catch (error) {
    return `Error reading structure: ${error.message}`;
  }
}

module.exports = { getRepoStructure };
