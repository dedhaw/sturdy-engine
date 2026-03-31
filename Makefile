run-agent-service:
	cd devcode-agent-service && make run

setup-agent-service:
	cd devcode-agent-service && make setup

run-cli:
	cd devcode-cli && node src/index.js chat

setup-cli:
	cd devcode-cli && npm install