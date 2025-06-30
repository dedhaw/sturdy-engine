const vscode = require('vscode');
const ChatViewProvider = require('./components/ChatViewProvider');
const { selector } = require('./commands/SelectAI');
const chat = require('./commands/Chat'); // Import the chat command

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('DevCode extension is now active!');

  const provider = new ChatViewProvider(context);
  const viewProviderDisposable = vscode.window.registerWebviewViewProvider(
    'devcodeChatView',
    provider,
    { 
      webviewOptions: { 
        retainContextWhenHidden: true 
      } 
    }
  );

  const select = vscode.commands.registerCommand('devcode.selectAI', selector);
  const aiAgentCommand = vscode.commands.registerCommand('devcode.aiAgent', () => {

    if (provider.isVisible()) {
      vscode.window.showInformationMessage('DevCode is already active in the sidebar!');
    } else {
      vscode.commands.executeCommand('workbench.view.extension.devcodeSidebar');
    }
  });

  const openChatPanelCommand = vscode.commands.registerCommand('devcode.openChatPanel', chat);

  context.subscriptions.push(
    viewProviderDisposable,
    select,
    aiAgentCommand,
    openChatPanelCommand
  );
}

function deactivate() {
}

module.exports = { activate, deactivate };