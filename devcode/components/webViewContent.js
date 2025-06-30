const { getCurrentModel } = require("../commands/SelectAI")

function getWebviewContent() {
	  const currModel = getCurrentModel() || "OpenAI";
  	const currModelEscaped = JSON.stringify(currModel);

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
      <!-- 3️⃣ initialize with the current model -->
      <span id="modelInfo">Using ${currModel}</span>
    </div>

    <div class="input-container">
      <input type="text" id="userInput" placeholder="Type a message…" />
      <button onclick="sendMessage()">Send</button>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      const currModel = ${currModelEscaped};

      const chat = document.getElementById("chat");
      const input = document.getElementById("userInput");
      const toggleBtn = document.getElementById("aiToggle");
      const info = document.getElementById("modelInfo");
      window.currentBotOutput = "";
      let isOfflineMode = false;

      function appendPlainTextMessage(sender, text) {
        const m = document.createElement("div");
        m.className = "message " + sender;
        m.textContent = text;
        chat.appendChild(m);
        chat.scrollTop = chat.scrollHeight;
      }

      function sendMessage() {
        const txt = input.value.trim();
        if (!txt) return;
        appendPlainTextMessage("user", txt);
        vscode.postMessage({ type: "userInput", text: txt });
        input.value = "";
      }

      input.addEventListener("keydown", e => e.key === "Enter" && sendMessage());

      function toggleAI() {
        vscode.postMessage({ type: "toggleAI" });
      }

      window.addEventListener("message", event => {
        const msg = event.data;
        if (msg.type === "resetBotMessage") {
          appendPlainTextMessage("bot", "");
          window.currentBotOutput = "";
        }
        if (msg.type === "addText" || msg.type === "end") {
          window.currentBotOutput += msg.text;
          const bots = chat.getElementsByClassName("bot");
          bots[bots.length - 1].innerHTML = window.currentBotOutput;
          chat.scrollTop = chat.scrollHeight;
        }
        if (msg.type === "aiModeChanged") {
          isOfflineMode = msg.isOffline;
          if (isOfflineMode) {
            toggleBtn.textContent = "💻 Local AI";
            info.textContent = "Using " + msg.modelName;
          } else {
            toggleBtn.textContent = "🌐 Online AI";
            info.textContent = "Using OpenAI";
          }
        }
      });
    </script>
	</body>
	</html>`;
}

module.exports = { getWebviewContent };