const vscode = require('vscode');
const { getWebviewContent } = require('../components/webViewContent');
const BackendClient = require('../ai/BackendClient');
const { SYSTEM_PROMPTS, createUserMessageWithSystem } = require('../ai/prompts');

class ChatViewProvider {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.view = null;
    this.api = new BackendClient('http://localhost:8040');
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
    
    const options = {
      provider: useOfflineAI ? 'ollama' : 'openai',
      model: useOfflineAI ? selectedModel : null
    };
    
    try {
      await this.api.chatCompletion(messages, (token) => {
        webviewView.webview.postMessage({ type: 'addText', text: token });
      }, options);
    } catch (error) {
      webviewView.webview.postMessage({ type: 'addText', text: `<p style="color: red;">Error: ${error.message}. Is the backend running at http://localhost:8040?</p>` });
    }
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