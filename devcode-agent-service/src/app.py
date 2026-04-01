from fastapi import FastAPI
from dotenv import load_dotenv
import os

# Load env before importing routes which initialize agents
load_dotenv()

from utils.ollama_manager import OllamaManager
from routes import chat, models

app = FastAPI(title="DevCode Backend")
ollama_manager = OllamaManager()

# Include routers with /api prefix
app.include_router(chat.router, prefix="/api")
app.include_router(models.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    print("Starting up DevCode Backend...")
    if not ollama_manager.is_installed():
        print("Ollama command not found. Local AI models will not be available until Ollama is installed (ollama.com).")
    else:
        ollama_manager.start_server()

@app.on_event("shutdown")
def shutdown_event():
    print("Shutting down DevCode Backend...")
    ollama_manager.stop_server()

@app.get("/")
async def root():
    return {
        "status": "ok", 
        "message": "DevCode Backend is running",
        "ollama_installed": ollama_manager.is_installed()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8040)
