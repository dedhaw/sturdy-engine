import json
import re
from agents.base_agent import BaseAgent
from agents.intent_agent.prompts import INTENT_PROMPT

class IntentAgent(BaseAgent):
    def get_system_prompt(self):
        return INTENT_PROMPT

    async def analyze(self, messages, repo_structure, provider="openai", model=None):
        # Create a copy of messages to not modify the original list
        history_context = ""
        for m in messages:
            history_context += f"{m['role'].upper()}: {m['content']}\n"

        prompt = f"Conversation History:\n{history_context}\n\nRepository Structure:\n{repo_structure}"
        
        # We use a single-shot prompt for the intent agent with all context
        run_messages = [{"role": "user", "content": prompt}]
        
        full_response = ""
        async for token in self.run(run_messages, provider=provider, model=model, stream=True):
            full_response += token
            
        self.log("intent_agent", f"Raw Response:\n{full_response}")

        try:
            # Look for the last JSON object in case of reasoning/filler
            json_match = re.findall(r'\{.*\}', full_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match[-1])
                self.log("intent_agent", f"Parsed Intent:\n{json.dumps(parsed, indent=2)}")
                return parsed
            return json.loads(full_response)
        except Exception as e:
            self.log("intent_agent", f"Parse Error: {str(e)}")
            return {"files_to_read": [], "reasoning": f"Parse Error: {str(e)}"}
