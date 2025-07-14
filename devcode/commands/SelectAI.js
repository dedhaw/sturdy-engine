const vscode = require('vscode');
const OfflineAIClient = require('../ai/OfflineAIClient');

async function selector() {
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
            await vscode.commands.executeCommand('devcode.refreshChatView');
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
                await vscode.commands.executeCommand('devcode.refreshChatView');
            });
        }
        
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

function getCurrentModel() {
  const ollama = new OfflineAIClient();
  const model = ollama.getSelectedModel();
  return model || null;
}

module.exports = {
    selector,
    getCurrentModel
};