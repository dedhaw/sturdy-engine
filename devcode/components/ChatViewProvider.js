const vscode = require('vscode');
const { getWebviewContent } = require('../components/webViewContent');
const OfflineAIClient = require('../ai/OfflineAIClient');
const OnlineAIClient = require('../ai/OnlineAIClient');
const { SYSTEM_PROMPTS, createUserMessageWithSystem } = require('../ai/prompts');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class ChatViewProvider {
  /** @param {vscode.ExtensionContext} context */
  constructor(context) {
    this.context = context;
    this.view = null;
    this.api = new OnlineAIClient(process.env.OPENAI_API_KEY);
  }

  refresh() {
    if (this.view) {
      this.view.webview.html = getWebviewContent()
    }
  }
  /**
   * Called by VS Code when the view is created in the sidebar
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView, context, token) {
    this.view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = getWebviewContent();

    // const config = vscode.workspace.getConfiguration('devcode');
    // const isOffline = config.get('useOfflineAI', false);
    // const ollama = new OfflineAIClient();
    // const selectedModel = ollama.getSelectedModel() || 'OpenAI';
    // webviewView.webview.postMessage({
    //   type: 'aiModeChanged',
    //   isOffline: isOffline,
    //   modelName: selectedModel
    // });
    

    webviewView.webview.postMessage({
      type: 'aiModeChanged',
      isOffline: false,
      modelName: 'OpenAI'
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

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        console.log('DevCode chat view is now visible');
      }
    });
  }

  async handleToggleAI(webviewView) {
    const ollama = new OfflineAIClient();
    const selectedModel = ollama.getSelectedModel();
    
    if (!selectedModel) {
      const result = await vscode.window.showWarningMessage(
        'No local model selected. Would you like to select one?', 
        'Select Model', 'Cancel'
      );
      if (result === 'Select Model') {
        vscode.commands.executeCommand('devcode.selectAI');
      }
      return;
    }
    
    const config = vscode.workspace.getConfiguration('devcode');
    const currentMode = config.get('useOfflineAI', false);
    await config.update('useOfflineAI', !currentMode, vscode.ConfigurationTarget.Global);
    
    webviewView.webview.postMessage({ 
      type: 'aiModeChanged', 
      isOffline: !currentMode,
      modelName: selectedModel
    });
  }

  async handleUserInput(message, webviewView) {
    const userMessage = createUserMessageWithSystem(message.text, SYSTEM_PROMPTS.htmlFormatting);
    const messages = [userMessage];
    
    webviewView.webview.postMessage({ type: 'resetBotMessage' });
    
    const config = vscode.workspace.getConfiguration('devcode');
    const useOfflineAI = config.get('useOfflineAI', false);
    
    console.log('Using offline AI:', useOfflineAI);
    
    if (useOfflineAI) {
      const ollama = new OfflineAIClient();
      console.log('Starting ollama chat completion');
      await ollama.chatCompletion(messages, (token) => {
        console.log('Received token from ollama:', token);
        webviewView.webview.postMessage({ type: 'addText', text: token });
      });
      console.log('Ollama chat completion finished');
    } else {
      await this.api.chatCompletion(messages, (token) => {
        webviewView.webview.postMessage({ type: 'addText', text: token });
      });
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