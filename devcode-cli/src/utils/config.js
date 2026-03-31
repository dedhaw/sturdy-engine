const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(os.homedir(), '.devcode-config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading config:', e.message);
      return {};
    }
  }
  return {};
}

function saveConfig(config) {
  try {
    const currentConfig = loadConfig();
    const newConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving config:', e.message);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
};
