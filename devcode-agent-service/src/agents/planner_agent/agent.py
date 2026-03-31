import json
import re
from agents.base_agent import BaseAgent
from agents.planner_agent.prompts import PLANNER_PROMPT

class PlannerAgent(BaseAgent):
    def get_system_prompt(self):
        return PLANNER_PROMPT

    async def create_plan(self, user_query, repo_structure, provider="openai", model=None):
        prompt = f"User Request: {user_query}\n\nRepository Structure:\n{repo_structure}"
        messages = [{"role": "user", "content": prompt}]
        full_response = ""
        async for token in self.run(messages, provider=provider, model=model, stream=True):
            full_response += token
        try:
            json_match = re.search(r'\[.*\]', full_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return json.loads(full_response)
        except Exception:
            return []
