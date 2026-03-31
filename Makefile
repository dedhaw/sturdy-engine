run-agent-service:
	cd devcode-agent-service

setup-agent-service:
	cd devcode-agent-service && pip install -r requirments.txt

run-cli:
	cd devcode-cli && node index.js chat

setup-cli:
	cd devcode-cli && npm install