from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
from typing import List, Optional, Dict
from dotenv import load_dotenv
import os
import signal
import sys

from agents.chat_agent import ChatAgent
from api_clients.ollama import OllamaClient
from utils.ollama_manager import OllamaManager

load_dotenv()

app = FastAPI(title="DevCode Backend")
agent = ChatAgent()
ollama_client = OllamaClient()
ollama_manager = OllamaManager()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = None
    stream: Optional[bool] = True
    provider: Optional[str] = "openai"

class ModelInstallRequest(BaseModel):
    name: str

@app.on_event("startup")
async def startup_event():
    print("Starting up DevCode Backend...")
    if not ollama_manager.is_installed():
        print("Ollama not found. Attempting auto-install...")
        try:
            await ollama_manager.download()
        except Exception as e:
            print(f"Auto-install failed: {e}. Please install Ollama manually.")
    
    if ollama_manager.is_installed():
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

@app.get("/models/installed")
async def get_installed_models():
    models = await ollama_client.get_models()
    return {"models": models}

@app.get("/models/available")
async def get_available_models():
    # 1. Try scraping first for real-time data
    remote_models = await ollama_client.get_remote_models()
    
    # 2. Load static catalog as fallback/supplement
    catalog_path = os.path.join(os.path.dirname(__file__), "utils", "catalog.json")
    catalog_models = []
    try:
        if os.path.exists(catalog_path):
            with open(catalog_path, "r") as f:
                catalog = json.load(f)
                catalog_models = catalog.get("models", [])
    except Exception as e:
        print(f"Error loading catalog: {e}")

    # 3. Combine and de-duplicate (prefer scraped description)
    seen_names = {m["name"] for m in remote_models}
    for m in catalog_models:
        if m["name"] not in seen_names:
            remote_models.append(m)
            seen_names.add(m["name"])
            
    return {"models": remote_models}

@app.post("/models/install")
async def install_model(request: ModelInstallRequest):
    # Ensure server is running before install
    if not ollama_manager.start_server():
        return {"status": "error", "message": "Could not start Ollama server"}
        
    return StreamingResponse(
        ollama_client.pull_model(request.name),
        media_type="text/plain"
    )

@app.post("/chat")
async def chat(request: ChatRequest):
    messages_list = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # If provider is ollama, ensure server is running
    if request.provider == "ollama":
        ollama_manager.start_server()

    return StreamingResponse(
        agent.run(
            messages=messages_list,
            provider=request.provider,
            model=request.model,
            stream=request.stream
        ), 
        media_type="text/plain"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8040)
