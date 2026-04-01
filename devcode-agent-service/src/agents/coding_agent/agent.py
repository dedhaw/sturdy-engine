from agents.base_agent import BaseAgent
from agents.coding_agent.prompts import CODING_PROMPT
from utils.prompt_loader import PromptLoader

class CodingAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.loader = PromptLoader()

    def get_system_prompt(self, file_path=None):
        # Start with the main architectural persona
        architect_persona = self.loader.get_base_coding_prompt()
        
        # Combine with the task instructions
        base_prompt = f"{architect_persona}\n\n{CODING_PROMPT}"
        
        if file_path:
            extra_instructions = self.loader.get_prompt_for_file(file_path)
            if extra_instructions:
                base_prompt = f"{extra_instructions}\n\n{base_prompt}"
        return base_prompt

    async def generate_code(self, plan, step, file_context, repo_structure, history=None, provider="openai", model=None):
        file_path = step.get("metadata", {}).get("file_path") if isinstance(step, dict) else None
        
        system_content = self.get_system_prompt(file_path)
        
        history_text = ""
        if history:
            history_text = "Conversation History:\n"
            for m in history:
                history_text += f"{m['role'].upper()}: {m['content']}\n"
            history_text += "\n"

        prompt = f"{history_text}Plan:\n{plan}\n\nStep:\n{step}\n\nContext:\n{file_context}\n\nRepo:\n{repo_structure}"
        
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": prompt}
        ]
        
        full_response = ""
        if provider == "openai":
            async for token in self.openai.chat_completion(messages, model or "gpt-4o", True):
                full_response += token
        elif provider == "ollama":
            async for token in self.ollama.chat_completion(messages, model, True):
                full_response += token
        
        self.log("coding_agent", f"Raw Response:\n{full_response}")

        # Robust Parsing: 
        import re
        code_part = re.sub(r'<justification>.*?</justification>', '', full_response, flags=re.DOTALL).strip()
        
        if "--- ARCHITECT_JUSTIFICATION ---" in code_part:
            code_part = code_part.split("--- ARCHITECT_JUSTIFICATION ---")[0].strip()
        
        if code_part.startswith("```"):
            lines = code_part.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            code_part = "\n".join(lines).strip()
            
        self.log("coding_agent", f"Extracted Code:\n{code_part}")
        return code_part
