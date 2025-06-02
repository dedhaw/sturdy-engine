const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "devcode" is now active!');

	

	const disposable = vscode.commands.registerCommand('devcode.aiAgent', function () {
		vscode.window.showInformationMessage('activate AI Agent from devcode!');
		const panel = vscode.window.createWebviewPanel(
		'mySideWindow', // Identifies the type of the webview
		'My Side Window', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in
		{
			enableScripts: true, // Allow JavaScript to run in the webview
			retainContextWhenHidden: true, // Keep the webview alive when hidden
		}
		);

		// Set the HTML content of the webview
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Side Window</title>
    </head>

	<style>
	body, html {
		margin: auto;
		padding: 0; 
		height: 100%; 
		width: fit-content;
		overflow: hidden;
	}
	.container {
		width: 300px;
		max-width: 100%;
		height: 100%;
		box-sizing: border-box;
	}
	</style>

    <body>
        <h1>Hello from my Side Window!</h1>
        <p>This is a webview panel created with JavaScript.</p>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
