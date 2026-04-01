const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let backendProcess = null;

async function startBackend() {
  // 1. Check for compiled binary (Production mode)
  const binaryPath = path.join(__dirname, '../../server/devcode-backend');
  // 2. Fallback to source code (Development mode)
  const serviceDir = path.join(__dirname, '../../../devcode-agent-service');
  
  if (fs.existsSync(binaryPath)) {
    // Production
    backendProcess = spawn(binaryPath, [], {
      stdio: 'ignore',
      detached: false,
      env: process.env // Passes down OPENAI_API_KEY, etc.
    });
  } else if (fs.existsSync(serviceDir)) {
    // Development fallback
    backendProcess = spawn('make', ['run'], {
      cwd: serviceDir,
      stdio: 'ignore',
      detached: false,
      env: process.env
    });
  } else {
    console.error('Could not find DevCode backend binary or source directory.');
    return;
  }

  backendProcess.on('error', (err) => {
    console.error('Failed to start DevCode backend:', err);
  });

  // Give the server a moment to start up
  await new Promise(resolve => setTimeout(resolve, 3000));
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

module.exports = { startBackend, stopBackend };
