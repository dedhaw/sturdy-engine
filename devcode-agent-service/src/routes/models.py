from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import os
from api_clients.ollama import OllamaClient
from utils.ollama_manager import OllamaManager

router = APIRouter(prefix="/models")
ollama_client = OllamaClient()
ollama_manager = OllamaManager()

class ModelInstallRequest(BaseModel):
    name: str

@router.get("/installed")
async def get_installed_models():
    models = await ollama_client.get_models()
    return {"models": models}

@router.get("/available")
async def get_available_models():
    # Fetch real-time data from Ollama library website
    remote_models = await ollama_client.get_remote_models()
    return {"models": remote_models}

@router.get("/tags/{model_name}")
async def get_model_tags(model_name: str):
    # Fetch specific parameter versions for the model
    tags = await ollama_client.get_remote_tags(model_name)
    return {"tags": tags}

@router.post("/install")
async def install_model(request: ModelInstallRequest):
    # Ensure server is running before install
    if not ollama_manager.start_server():
        return {"status": "error", "message": "Could not start Ollama server"}
        
    return StreamingResponse(
        ollama_client.pull_model(request.name),
        media_type="text/plain"
    )

@router.delete("/uninstall/{model_name}")
async def uninstall_model(model_name: str):
    success = await ollama_client.delete_model(model_name)
    return {"status": "success" if success else "error"}
