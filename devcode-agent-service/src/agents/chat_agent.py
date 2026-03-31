from api_clients.openai_client import OpenAIClient
from api_clients.ollama import OllamaClient
import os

class ChatAgent:
    def __init__(self):
        self.openai = OpenAIClient()
        self.ollama = OllamaClient()

    async def run(self, messages, provider="openai", model=None, stream=True):
        if provider == "openai":
            target_model = model or "gpt-4o-mini"
            async for token in self.openai.chat_completion(messages, target_model, stream):
                yield token
        elif provider == "ollama":
            if not model:
                yield "Error: No model specified for Ollama provider."
                return
            async for token in self.ollama.chat_completion(messages, model, stream):
                yield token
        else:
            yield f"Error: Unsupported provider '{provider}'"
