import ollama
import json
import asyncio
import httpx
import re
from bs4 import BeautifulSoup

class OllamaClient:
    def __init__(self, host="http://localhost:11434"):
        self.client = ollama.AsyncClient(host=host)

    async def get_remote_models(self):
        """Scrape the Ollama library for available base models."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get("https://ollama.com/library")
                if response.status_code != 200:
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                models = []
                
                for link in soup.find_all('a', href=re.compile(r'^/library/')):
                    h2 = link.find('h2')
                    if not h2: continue
                    
                    name = h2.text.strip()
                    description = ""
                    params = "N/A"
                    
                    p = link.find('p')
                    if p:
                        description = p.text.strip()
                    
                    # Look for featured parameters (e.g. 7B, 14B) on the main list
                    # These are usually in spans within the same link block
                    for span in link.find_all('span'):
                        text = span.text.strip()
                        if re.search(r'\d+(\.\d+)?[bB]', text):
                            params = text
                            break
                    
                    if name:
                        models.append({
                            "name": name,
                            "description": description or "Community model",
                            "parameters": params
                        })
                
                unique_models = []
                seen = set()
                for m in models:
                    if m["name"] not in seen:
                        unique_models.append(m)
                        seen.add(m["name"])
                        
                return unique_models
            except Exception as e:
                print(f"Scraping error: {e}")
                return []

    async def get_remote_tags(self, model_name):
        """Scrape the tags page for a specific model to get parameter versions."""
        url = f"https://ollama.com/library/{model_name}/tags"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url)
                if response.status_code != 200:
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                tags = []
                
                # Each entry in the tags table includes the full model:tag string
                pattern = re.compile(rf'{model_name}:([a-zA-Z0-9._-]+)')
                
                # Search for all elements containing the model:tag pattern
                for el in soup.find_all(string=pattern):
                    match = pattern.search(el)
                    if not match: continue
                    
                    tag_name = match.group(1)
                    
                    # Find the nearest container to extract the associated size
                    size = "N/A"
                    parent = el.parent
                    # Traverse up to find the container row
                    while parent and parent.name != 'body':
                        # Check for size info (GB, MB, TB) in this row's text
                        text_content = parent.get_text(separator=' ')
                        size_match = re.search(r'(\d+(\.\d+)?\s*(GB|MB|TB))', text_content)
                        if size_match:
                            size = size_match.group(1)
                            break
                        parent = parent.parent
                    
                    tags.append({
                        "name": tag_name,
                        "full_name": f"{model_name}:{tag_name}",
                        "size": size
                    })

                # Deduplicate by tag name while preserving order
                unique_tags = []
                seen = set()
                for t in tags:
                    if t["name"] not in seen:
                        unique_tags.append(t)
                        seen.add(t["name"])

                if not unique_tags:
                    unique_tags.append({"name": "latest", "full_name": f"{model_name}:latest", "size": "Unknown"})

                return unique_tags[:50]
            except Exception as e:
                print(f"Tag scraping error: {e}")
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

    async def delete_model(self, model_name):
        try:
            await self.client.delete(model=model_name)
            return True
        except Exception:
            return False

    async def get_models(self):
        try:
            response = await self.client.list()
            # The library returns a ModelList object, we need to convert to our format
            return [{"name": m.model, "size": m.size, "modified_at": m.modified_at} for m in response.models]
        except Exception:
            return []
