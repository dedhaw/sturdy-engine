const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	

	const disposable = vscode.commands.registerCommand('devcode.aiAgent', function () {
		vscode.window.showInformationMessage('activate AI Agent from devcode!');
		const panel = vscode.window.createWebviewPanel(
		'ai',
		'Dev Code',
		vscode.ViewColumn.Two,
		{
			enableScripts: true, // Allow JavaScript to run in the webview
			retainContextWhenHidden: true, // Keep the webview alive when hidden
		}
		);

		panel.webview.html = getWebviewContent();
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

		.user {
			background-color: #0a84ff;
			align-self: flex-end;
			color: white;
		}

		.bot {
			background-color: #333;
			align-self: flex-start;
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
		<div class="message bot">Hello! let's start building.</div>
	</div>

	<div class="input-container">
		<input type="text" id="userInput" placeholder="Type a message..." />
		<button onclick="sendMessage()">Send</button>
	</div>

	<script>
		const chat = document.getElementById('chat');
		const input = document.getElementById('userInput');

		function sendMessage() {
			const text = input.value.trim();
			
			if (!text) return;

			// User
			const userMsg = document.createElement('div');
			userMsg.className = 'message user';
			userMsg.textContent = text;
			chat.appendChild(userMsg);

			// Bot
			const botMsg = document.createElement('div');
			botMsg.className = 'message bot';
			botMsg.textContent = getFakeResponse(text);
			chat.appendChild(botMsg);

			input.value = '';
			chat.scrollTop = chat.scrollHeight;
		}

		function getFakeResponse(input) {
			return "I'm just a mock AI for now!";
		}

		input.addEventListener("keydown", e => {
			if (e.key === "Enter") sendMessage();
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
