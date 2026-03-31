from api_clients.openai_client import OpenAIClient
from api_clients.ollama import OllamaClient
import importlib
import os

class BaseAgent:
    def __init__(self):
        self.openai = OpenAIClient()
        self.ollama = OllamaClient()

    def get_system_prompt(self):
        # This will be overridden by subclasses or loaded from their specific prompts.py
        return "You are a helpful AI assistant."

    async def run(self, messages, provider="openai", model=None, stream=True):
        # 1. Ensure system prompt is present
        has_system = any(m.get('role') == 'system' for m in messages)
        if not has_system:
            messages.insert(0, {"role": "system", "content": self.get_system_prompt()})

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
