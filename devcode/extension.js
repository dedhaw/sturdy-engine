const vscode = require('vscode');
const path = require('path');
const OnlineAIClient = require('./OnlineAIClient');
const OfflineAIClient = require('./OfflineAIClient');
const { SYSTEM_PROMPTS, createUserMessageWithSystem } = require('./prompts');

require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * @param {vscode.ExtensionContext} context
 */

async function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	const api = new OnlineAIClient(process.env.OPENAI_API_KEY);

	const activeEditor = vscode.window.activeTextEditor;

	if (activeEditor) {
		const doc = activeEditor.document;
		const txt = doc.getText();
		const name = doc.fileName;
		const lang = doc.languageId;
	}

	const chat = vscode.commands.registerCommand('devcode.aiAgent', function () {
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
			if (message.type === 'toggleAI') {
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
				
				// Toggle between online and offline
				const config = vscode.workspace.getConfiguration('devcode');
				const currentMode = config.get('useOfflineAI', false);
				await config.update('useOfflineAI', !currentMode, vscode.ConfigurationTarget.Global);
				
				panel.webview.postMessage({ 
					type: 'aiModeChanged', 
					isOffline: !currentMode,
					modelName: selectedModel
				});
			}
			
			if (message.type === 'userInput') {
				const userMessage = createUserMessageWithSystem(message.text, SYSTEM_PROMPTS.htmlFormatting);
    			const messages = [userMessage];
				panel.webview.postMessage({ type: 'resetBotMessage' });
				
				// Check which AI to use
				const config = vscode.workspace.getConfiguration('devcode');
				const useOfflineAI = config.get('useOfflineAI', false);
				
				console.log('Using offline AI:', useOfflineAI);
				
				if (useOfflineAI) {
					const ollama = new OfflineAIClient();
					console.log('Starting ollama chat completion');
					await ollama.chatCompletion(messages, (token) => {
						console.log('Received token from ollama:', token);
						panel.webview.postMessage({ type: 'addText', text: token });
						console.log('Ollama chat completion finished');
					});
				} else {
					await api.chatCompletion(messages, (token) => {
						panel.webview.postMessage({ type: 'addText', text: token });
					});
				}
			}
		});
	});

	const selectAI = vscode.commands.registerCommand('devcode.selectAI', async function () {
		vscode.window.showInformationMessage('select a model');
		
		const ollama = new OfflineAIClient();
		try {
			if (!(await ollama.isRunning())) {
				vscode.window.showErrorMessage('Ollama is not running. Please start Ollama first.');
				return;
			}

			const modelFamilies = ollama.getModelFamilies();
			const selectedFamily = await vscode.window.showQuickPick(modelFamilies, {
				placeHolder: 'Choose an AI model family',
				matchOnDescription: true
			});

			if (!selectedFamily) return;

			const modelSizes = ollama.getModelSizes(selectedFamily.value);
			const selectedModel = await vscode.window.showQuickPick(modelSizes, {
				placeHolder: `Choose ${selectedFamily.label} model size`
			});

			if (!selectedModel) return;

			const model = selectedModel['value'];

			if (await ollama.modelExists(model)) {
				vscode.window.showInformationMessage(`Model ${model} is ready!`);
				await ollama.saveSelectedModel(model);
			} else {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `Downloading ${model}`,
					cancellable: true
				}, async (progress, token) => {
					
					await ollama.downloadModel(model, (data) => {
						if (data.status) {
							progress.report({ message: data.status });
							
							if (data.completed && data.total) {
								const percentage = Math.round((data.completed / data.total) * 100);
								progress.report({ 
									increment: percentage,
									message: `${data.status} (${percentage}%)`
								});
							}
						}
						
						if (token.isCancellationRequested) {
							throw new Error('Download cancelled');
						}
					});
					
					vscode.window.showInformationMessage(`Successfully downloaded ${model}!`);
					await ollama.saveSelectedModel(model);
				});
			}
			
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error.message}`);
		}
	});	

	context.subscriptions.push(chat, selectAI);
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

		.ai-toggle-container {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 8px 12px;
			background-color: #2c2c2c;
			border-bottom: 1px solid #444;
		}

		#aiToggle {
			padding: 6px 12px;
			background-color: #0a84ff;
			border: none;
			border-radius: 4px;
			color: white;
			cursor: pointer;
			font-size: 12px;
		}

		#aiToggle:hover {
			background-color: #006edc;
		}

		#modelInfo {
			font-size: 12px;
			color: #999;
		}
	</style>
	</head>
	<body>

	<div class="chat-container" id="chat">
		<div class="message bot"><p>Hello! let's start building.</p></div>
	</div>

	<div class="ai-toggle-container">
		<button id="aiToggle" onclick="toggleAI()">🌐 Online AI</button>
		<span id="modelInfo">Using OpenAI</span>
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

		let isOfflineMode = false;

		function toggleAI() {
			vscode.postMessage({ type: 'toggleAI' });
		}

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
			if (message.type === 'aiModeChanged') {
				isOfflineMode = message.isOffline;
				const button = document.getElementById('aiToggle');
				const info = document.getElementById('modelInfo');
				if (isOfflineMode) {
					button.textContent = '💻 Local AI';
					info.textContent = 'Local Model';
				} else {
					button.textContent = '🌐 Online AI';
					info.textContent = 'Using OpenAI';
				}
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
