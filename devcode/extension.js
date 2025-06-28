
const vscode = require('vscode');
const chatRequest = require('./commands/Chat');
const { selector } = require('./commands/SelectAI');

/**
 * @param {vscode.ExtensionContext} context
 */

async function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	const chat = vscode.commands.registerCommand('devcode.aiAgent', chatRequest);

	const selectAI = vscode.commands.registerCommand('devcode.selectAI', selector);	

	context.subscriptions.push(chat, selectAI);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
