import ollama
import json
import asyncio
import httpx
from bs4 import BeautifulSoup

class OllamaClient:
    def __init__(self, host="http://localhost:11434"):
        self.client = ollama.AsyncClient(host=host)

    async def get_remote_models(self):
        """Scrape the Ollama library for available models."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get("https://ollama.com/library")
                if response.status_code != 200:
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                models = []
                # Find the h2 tags which contain the model names
                for h2 in soup.find_all('h2'):
                    name = h2.text.strip()
                    # Find description (usually in a sibling or parent)
                    # The current layout has descriptions in <p> after the <h2>
                    description = ""
                    parent = h2.find_parent('li')
                    if parent:
                        p = parent.find('p')
                        if p:
                            description = p.text.strip()
                    
                    if name:
                        models.append({
                            "name": name,
                            "description": description or "Community model"
                        })
                return models
            except Exception as e:
                print(f"Scraping error: {e}")
                return []

    async def chat_completion(self, messages, model, stream=True):
        try:
            if stream:
                async for chunk in await self.client.chat(model=model, messages=messages, stream=True):
                    yield chunk['message']['content']
            else:
                response = await self.client.chat(model=model, messages=messages, stream=False)
                yield response['message']['content']
        except Exception as e:
            yield f"Error: {str(e)}"

    async def pull_model(self, model_name):
        try:
            async for progress in await self.client.pull(model=model_name, stream=True):
                # Convert the ProgressResponse object to a dictionary for JSON serialization
                if hasattr(progress, 'model_dump'):
                    data = progress.model_dump()
                else:
                    data = dict(progress)
                yield json.dumps(data) + "\n"
        except Exception as e:
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

    async def get_models(self):
        try:
            response = await self.client.list()
            # The library returns a ModelList object, we need to convert to our format
            return [{"name": m.model, "size": m.size, "modified_at": m.modified_at} for m in response.models]
        except Exception:
            return []
