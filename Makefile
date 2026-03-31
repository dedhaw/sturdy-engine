run-agent-service:
	cd devcode-agent-service && make run

setup-agent-service:
	cd devcode-agent-service && pip install -r requirments

run-cli:
	cd devcode-cli && node src/index.js chat

install-model:
	cd devcode-cli && node src/index.js install $(model)
setup-cli:
	cd devcode-cli && npm install