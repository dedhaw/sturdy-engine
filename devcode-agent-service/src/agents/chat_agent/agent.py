from agents.base_agent import BaseAgent
from agents.chat_agent.prompts import MASTERPROMPT

class ChatAgent(BaseAgent):
    def get_system_prompt(self):
        return MASTERPROMPT
