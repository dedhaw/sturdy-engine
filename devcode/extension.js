const vscode = require('vscode');
const ChatViewProvider = require('./components/ChatViewProvider');

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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'devcode.refreshChatView',
      () => provider.refresh()
    )
  )

  const aiAgentCommand = vscode.commands.registerCommand('devcode.aiAgent', () => {
    if (provider.isVisible()) {
      vscode.window.showInformationMessage('DevCode is already active in the sidebar!');
    } else {
      vscode.commands.executeCommand('workbench.view.extension.devcodeSidebar');
    }
  });

  context.subscriptions.push(
    viewProviderDisposable,
    aiAgentCommand
  );
}

function deactivate() {
}

module.exports = { activate, deactivate };
