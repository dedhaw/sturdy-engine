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
    # 1. Try scraping first for real-time data
    remote_models = await ollama_client.get_remote_models()
    
    # 2. Load static catalog as fallback/supplement
    catalog_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "utils", "catalog.json")
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

@router.post("/install")
async def install_model(request: ModelInstallRequest):
    # Ensure server is running before install
    if not ollama_manager.start_server():
        return {"status": "error", "message": "Could not start Ollama server"}
        
    return StreamingResponse(
        ollama_client.pull_model(request.name),
        media_type="text/plain"
    )
