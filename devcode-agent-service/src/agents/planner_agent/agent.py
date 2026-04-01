import json
import re
from agents.base_agent import BaseAgent
from agents.planner_agent.prompts import PLANNER_PROMPT

class PlannerAgent(BaseAgent):
    def get_system_prompt(self):
        return PLANNER_PROMPT

    async def create_plan(self, messages, repo_structure, provider="openai", model=None):
        history_context = ""
        for m in messages:
            history_context += f"{m['role'].upper()}: {m['content']}\n"

        prompt = f"Conversation History:\n{history_context}\n\nRepository Structure:\n{repo_structure}"
        
        run_messages = [{"role": "user", "content": prompt}]
        full_response = ""
        async for token in self.run(run_messages, provider=provider, model=model, stream=True):
            full_response += token
        
        self.log("planner_agent", f"Raw Response:\n{full_response}")

        try:
            # Look for the last JSON list in case of reasoning/filler
            json_match = re.findall(r'\[.*\]', full_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match[-1])
                self.log("planner_agent", f"Parsed Plan:\n{json.dumps(parsed, indent=2)}")
                return parsed
            return json.loads(full_response)
        except Exception as e:
            self.log("planner_agent", f"Parse Error: {str(e)}")
            return []
