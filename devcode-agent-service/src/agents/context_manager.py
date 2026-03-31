from collections import deque
from agents.extractor_agent.agent import ExtractorAgent

class ContextManager:
    def __init__(self, max_context=100):
        self.context = deque()
        self.summarize_context = []
        self.max = max_context
        self.extractor = ExtractorAgent()

    async def add_message(self, role, content, provider="openai", model=None):
        message = {"role": role, "content": content}
        self.context.append(message)
        
        if len(self.context) > self.max:
            self.summarize_context.append(self.context.popleft())
            
            if len(self.summarize_context) >= 100:
                await self.compressor(provider=provider, model=model)

    async def compressor(self, provider="openai", model=None):
        if not self.summarize_context:
            return

        transcript = "\n".join([f"{m['role']}: {m['content']}" for m in self.summarize_context])
        
        summary = await self.extractor.summarize(transcript, provider=provider, model=model)
        
        self.context.appendleft({
            "role": "system",
            "content": f"--- SUMMARY OF EARLIER CONTEXT ---\n{summary}\n----------------------------------"
        })
        
        self.summarize_context = []

    def get_messages(self):
        return list(self.context)
