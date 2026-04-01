SHELL := /bin/bash
VENV_NAME = .venv
VENV = $(VENV_NAME)/bin/activate

setup:
	python3 -m venv $(VENV_NAME) && \
	source $(VENV) && \
	pip install -r requirements.txt && \
	echo "✅ Setup Complete. Run 'make run' to start the backend."

run:
	source $(VENV) && \
	cd src && uvicorn app:app --reload --host 127.0.0.1 --port 8040

lint:
	source $(VENV) && \
	ruff check .

build:
	source $(VENV) && \
	pip install pyinstaller && \
	pyinstaller --onefile src/main.py --name devcode-backend --clean && \
	echo "✅ Backend binary built in devcode-agent-service/dist/"
