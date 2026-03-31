from agents.base_agent import BaseAgent
from agents.chat_agent.prompts import MASTERPROMPT
from agents.context_manager import ContextManager
from utils.ollama_manager import OllamaManager

class ChatAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.sessions = {}
        self.ollama_manager = OllamaManager()

    def get_system_prompt(self):
        return MASTERPROMPT

    async def run(self, messages, session_id="default", provider="openai", model=None, stream=True):
        if session_id not in self.sessions:
            self.sessions[session_id] = ContextManager(max_context=15)
        
        cm = self.sessions[session_id]
        
        if messages:
            last_msg = messages[-1]
            role = last_msg.get('role') if isinstance(last_msg, dict) else getattr(last_msg, 'role', 'user')
            content = last_msg.get('content') if isinstance(last_msg, dict) else getattr(last_msg, 'content', '')
            
            await cm.add_message(
                role=role, 
                content=content, 
                provider=provider, 
                model=model
            )

        managed_messages = cm.get_messages()

        if provider == "ollama":
            self.ollama_manager.start_server()

        full_response = ""
        async for token in super().run(
            messages=managed_messages,
            provider=provider,
            model=model,
            stream=stream
        ):
            full_response += token
            yield token
        
        if full_response:
            await cm.add_message(
                role="assistant", 
                content=full_response,
                provider=provider,
                model=model
            )
