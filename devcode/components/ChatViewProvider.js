const vscode = require('vscode');
const { getWebviewContent } = require('../components/webViewContent');
const BackendClient = require('../ai/BackendClient');
const { SYSTEM_PROMPTS, createUserMessageWithSystem } = require('../ai/prompts');

class ChatViewProvider {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.view = null;
    this.api = new BackendClient('http://localhost:8040/api');
    this.sessionId = Math.random().toString(36).substring(2, 15);
  }

  refresh() {
    if (this.view) {
      this.view.webview.html = getWebviewContent()
    }
  }

  resolveWebviewView(webviewView, context, token) {
    this.view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = getWebviewContent();

    const config = vscode.workspace.getConfiguration('devcode');
    const isOffline = config.get('useOfflineAI', false);
    const selectedModel = config.get('selectedModel', 'OpenAI');

    webviewView.webview.postMessage({
      type: 'aiModeChanged',
      isOffline: isOffline,
      modelName: isOffline ? selectedModel : 'OpenAI'
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        if (message.type === 'toggleAI') {
          await this.handleToggleAI(webviewView);
        } else if (message.type === 'userInput') {
          await this.handleUserInput(message, webviewView);
        } else if (message.type === 'approveStep') {
          await this.handleApproveStep(message, webviewView);
        }
      } catch (error) {
        console.error('Error handling webview message:', error);
        vscode.window.showErrorMessage(`DevCode Error: ${error.message}`);
      }
    });
  }

  async handleToggleAI(webviewView) {
    const config = vscode.workspace.getConfiguration('devcode');
    const currentMode = config.get('useOfflineAI', false);
    const selectedModel = config.get('selectedModel');
    
    // Toggle first
    const nextMode = !currentMode;
    
    if (nextMode && !selectedModel) {
      const result = await vscode.window.showWarningMessage(
        'No local model selected. Would you like to select one?', 
        'Select Model', 'Cancel'
      );
      if (result === 'Select Model') {
        vscode.commands.executeCommand('devcode.selectAI');
      }
      return;
    }
    
    await config.update('useOfflineAI', nextMode, vscode.ConfigurationTarget.Global);
    
    webviewView.webview.postMessage({ 
      type: 'aiModeChanged', 
      isOffline: nextMode,
      modelName: nextMode ? selectedModel : 'OpenAI'
    });
  }

  async handleUserInput(message, webviewView) {
    const userMessage = createUserMessageWithSystem(message.text, SYSTEM_PROMPTS.htmlFormatting);
    const messages = [userMessage];
    
    webviewView.webview.postMessage({ type: 'resetBotMessage' });
    
    const config = vscode.workspace.getConfiguration('devcode');
    const useOfflineAI = config.get('useOfflineAI', false);
    const selectedModel = config.get('selectedModel');
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const basePath = workspaceFolders ? workspaceFolders[0].uri.fsPath : null;
    
    const options = {
      provider: useOfflineAI ? 'ollama' : 'openai',
      model: useOfflineAI ? selectedModel : null,
      session_id: this.sessionId,
      base_path: basePath,
      repo_structure: basePath ? await this.getRepoStructure(basePath) : null
    };
    
    try {
      await this.api.chatCompletion(messages, (data) => {
        if (data.type === 'status') {
          webviewView.webview.postMessage({ type: 'status', text: data.content });
        } else if (data.type === 'chunk') {
          webviewView.webview.postMessage({ type: 'addText', text: data.content });
        } else if (data.type === 'plan') {
          webviewView.webview.postMessage({ type: 'showPlan', steps: data.steps });
        }
      }, options);
    } catch (error) {
      webviewView.webview.postMessage({ type: 'addText', text: `<p style="color: red;">Error: ${error.message}. Is the backend running at http://localhost:8040?</p>` });
    }
  }

  async handleApproveStep(message, webviewView) {
    const { stepId } = message;
    const config = vscode.workspace.getConfiguration('devcode');
    const useOfflineAI = config.get('useOfflineAI', false);
    const selectedModel = config.get('selectedModel');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const basePath = workspaceFolders ? workspaceFolders[0].uri.fsPath : null;

    webviewView.webview.postMessage({ type: 'status', text: 'Implementing changes...' });

    try {
      const result = await this.api.approveStep(this.sessionId, stepId, basePath, {
        provider: useOfflineAI ? 'ollama' : 'openai',
        model: useOfflineAI ? selectedModel : null,
        repo_structure: basePath ? await this.getRepoStructure(basePath) : null
      });

      if (result.status === 'success') {
        vscode.window.showInformationMessage('Successfully updated file.');
        webviewView.webview.postMessage({ type: 'stepCompleted', stepId, diff: result.diff });
      } else {
        vscode.window.showErrorMessage(`Failed to update file: ${result.message}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    } finally {
      webviewView.webview.postMessage({ type: 'status', text: '' });
    }
  }

  async getRepoStructure(basePath) {
    const { readdir, stat } = require('fs').promises;
    const path = require('path');
    
    async function buildTree(dir, depth = 0) {
      if (depth > 2) return "";
      try {
        const items = await readdir(dir);
        let structure = "";
        for (const item of items) {
          if (item === "node_modules" || item === ".git" || item === ".venv") continue;
          const fullPath = path.join(dir, item);
          const s = await stat(fullPath);
          if (s.isDirectory()) {
            structure += "  ".repeat(depth) + "[DIR] " + item + "\n";
            structure += await buildTree(fullPath, depth + 1);
          } else {
            structure += "  ".repeat(depth) + item + "\n";
          }
        }
        return structure;
      } catch (e) {
        return "";
      }
    }
    return await buildTree(basePath);
  }

  postMessage(message) {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  isVisible() {
    return this.view && this.view.visible;
  }
}

module.exports = ChatViewProvider;