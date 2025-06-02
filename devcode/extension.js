const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	const disposable = vscode.commands.registerCommand('devcode.aiAgent', function () {

		vscode.window.showInformationMessage('activate AI Agent from devcode!');
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
