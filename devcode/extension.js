
const vscode = require('vscode');
const path = require('path');
const chatRequest = require('./commands/Chat');
const offlineSelctor = require('./commands/SelectAI');

require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * @param {vscode.ExtensionContext} context
 */

async function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	const chat = vscode.commands.registerCommand('devcode.aiAgent', chatRequest);

	const selectAI = vscode.commands.registerCommand('devcode.selectAI', offlineSelctor);	

	context.subscriptions.push(chat, selectAI);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
