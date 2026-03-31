.PHONY: setup run run-cli test lint

setup:
	npm install
	@if [ ! -f .env ]; then \
		echo "OPENAI_API_KEY=your_api_key_here" > .env; \
		echo "Created .env file. Please add your API key."; \
	fi

run:
	node src/index.js chat

run-cli:
	node src/index.js chat

lint:
	# Add linting command here if needed
	echo "No linting command configured yet."
