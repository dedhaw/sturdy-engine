from agents.base_agent import BaseAgent
from agents.extractor_agent.prompts import SUMMARIZER_PROMPT

class ExtractorAgent(BaseAgent):
    def get_system_prompt(self):
        return SUMMARIZER_PROMPT

    async def summarize(self, text, provider="openai", model=None):
        messages = [{"role": "user", "content": f"Summarize the following conversation context:\n\n{text}"}]
        
        full_summary = ""
        async for token in self.run(messages, provider=provider, model=model, stream=True):
            full_summary += token
            
        self.log("extractor_agent", f"Summary: {full_summary}")
        return full_summary
