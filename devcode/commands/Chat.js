const vscode = require('vscode');
const OfflineAIClient = require('../ai/OfflineAIClient');
const OnlineAIClient = require('../ai/OnlineAIClient');
const { SYSTEM_PROMPTS, createUserMessageWithSystem } = require('../ai/prompts');
const { getWebviewContent } = require("../components/webViewContent")

const api = new OnlineAIClient(process.env.OPENAI_API_KEY);

function chat () {
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
}

module.exports = chat;