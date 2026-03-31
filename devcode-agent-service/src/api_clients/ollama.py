import httpx
import json
import asyncio

class OllamaClient:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url

    async def chat_completion(self, messages, model, stream=True):
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                payload = {
                    "model": model,
                    "messages": messages,
                    "stream": stream
                }
                
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    if response.status_code != 200:
                        yield f"Error: Ollama returned status {response.status_code}"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                            if data.get("done", False):
                                break
            except Exception as e:
                yield f"Error: {str(e)}"

    async def get_models(self):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.json().get("models", [])
            except Exception:
                return []
