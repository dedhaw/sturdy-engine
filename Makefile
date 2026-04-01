run-agent-service:
	cd devcode-agent-service && make run

setup-agent-service:
	cd devcode-agent-service && make setup

run-cli:
	cd devcode-cli && node src/index.js chat

setup-cli:
	cd devcode-cli && npm install

build-prod:
	cd devcode-agent-service && make build
	mkdir -p devcode-cli/server
	mv devcode-agent-service/dist/devcode-backend devcode-cli/server/
	echo "🚀 Production build complete. Backend binary moved to devcode-cli/server/"

link-cli:
	cd devcode-cli && npm link