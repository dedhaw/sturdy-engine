const vscode = require('vscode');
const openai = require('openai');
const path = require('path');
const OnlineAIClient = require('./OnlineAIClient')

require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * @param {vscode.ExtensionContext} context
 */

async function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	const api = new OnlineAIClient(process.env.OPENAI_API_KEY);

	const disposable = vscode.commands.registerCommand('devcode.aiAgent', function () {
		vscode.window.showInformationMessage('activated devcode!');

		const panel = vscode.window.createWebviewPanel(
			'ai',
			'DevCode',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(async (message) => {
		if (message.type === 'userInput') {
			const messages = [{ role: "user", content: message.text }];

			panel.webview.postMessage({ type: 'resetBotMessage' });

			await api.chatCompletion(messages, (token) => {
			panel.webview.postMessage({ type: 'addText', text: token });
			});
		}
		});
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return /* html */ `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<title>Dev Code</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body, html {
			margin: 0;
			padding: 0;
			height: 100%;
			font-family: sans-serif;
			background-color: #1e1e1e;
			color: #e0e0e0;
			display: flex;
			flex-direction: column;
		}

		.chat-container {
			flex: 1;
			padding: 16px;
			overflow-y: auto;
		}

		.message {
			margin-bottom: 12px;
			max-width: 80%;
			padding: 10px 14px;
			border-radius: 10px;
			line-height: 1.4;
		}

		.message * {
			margin: 0;
			padding: 0;
		}

		.message p + p,
		.message h1 + *,
		.message h2 + *,
		.message h3 + *,
		.message h4 + *,
		.message h5 + *,
		.message h6 + *,
		.message ul + *,
		.message ol + *,
		.message pre + *,
		.message blockquote + * {
			margin-top: 8px;
		}

		.message li + li {
			margin-top: 4px;
		}

		.message pre {
			padding: 8px;
			background-color: #2d2d2d;
			border-radius: 4px;
			overflow-x: auto;
		}

		.message code {
			background-color: #2d2d2d;
			padding: 2px 4px;
			border-radius: 3px;
			font-family: 'Courier New', monospace;
		}

		.user {
			background-color: #0a84ff;
			align-self: flex-end;
			color: white;
		}

		.bot {
			background-color: #333;
			align-self: flex-start;
			padding: 0 auto;
		}

		.input-container {
			display: flex;
			padding: 12px;
			border-top: 1px solid #444;
			background-color: #2c2c2c;
		}

		.input-container input {
			flex: 1;
			padding: 10px;
			border: none;
			border-radius: 6px;
			background: #444;
			color: #fff;
		}

		.input-container button {
			margin-left: 8px;
			padding: 10px 16px;
			background-color: #0a84ff;
			border: none;
			border-radius: 6px;
			color: white;
			cursor: pointer;
		}

		.input-container button:hover {
			background-color: #006edc;
		}
	</style>
	</head>
	<body>

	<div class="chat-container" id="chat">
		<div class="message bot"><p>Hello! let's start building.</p></div>
	</div>

	<div class="input-container">
		<input type="text" id="userInput" placeholder="Type a message..." />
		<button onclick="sendMessage()">Send</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const chat = document.getElementById('chat');
		const input = document.getElementById('userInput');

		function appendPlainTextMessage(sender, text) {
			const message = document.createElement('div');
			message.className = "message " + sender;
			message.textContent = text;
			chat.appendChild(message);
			chat.scrollTop = chat.scrollHeight;
		}

		function appendHTMLMessage(sender, html) {
			const message = document.createElement('div');
			message.className = "message " + sender;
			message.innerHTML = html;
			chat.appendChild(message);
			chat.scrollTop = chat.scrollHeight;
		}

		function sendMessage() {
			const text = input.value.trim();
			if (!text) return;
			appendPlainTextMessage('user', text);
			vscode.postMessage({ type: 'userInput', text });
			input.value = '';
		}

		input.addEventListener('keydown', e => {
			if (e.key === 'Enter') sendMessage();
		});

		window.currentBotOutput = '';

		window.addEventListener('message', event => {
			const message = event.data;

			if (message.type === 'resetBotMessage') {
				appendPlainTextMessage('bot', '');
				window.currentBotOutput = '';
			}

			if (message.type === 'addText') {
				window.currentBotOutput += message.text;

				const bots = chat.getElementsByClassName('bot');
				if (bots.length === 0) return;
				const lastBot = bots[bots.length - 1];

				lastBot.innerHTML = window.currentBotOutput;
				chat.scrollTop = chat.scrollHeight;
			}

			if (message.type === 'end') {
				const bots = chat.getElementsByClassName('bot');
				if (bots.length === 0) return;
				const lastBot = bots[bots.length - 1];

				lastBot.innerHTML = window.currentBotOutput;
				chat.scrollTop = chat.scrollHeight;
			}
		});
	</script>

	</body>
	</html>`;
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
