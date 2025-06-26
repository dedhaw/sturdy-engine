const vscode = require('vscode');
const path = require('path');
const OnlineAIClient = require('./ai/OnlineAIClient');
const OfflineAIClient = require('./ai/OfflineAIClient');
const { SYSTEM_PROMPTS, createUserMessageWithSystem } = require('./ai/prompts');
const { getWebviewContent } = require("./components/webViewContent")

require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * @param {vscode.ExtensionContext} context
 */

async function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	const api = new OnlineAIClient(process.env.OPENAI_API_KEY);

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



function deactivate() {}

module.exports = {
	activate,
	deactivate
}
