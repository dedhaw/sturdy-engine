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

    async def generate_code(self, plan, step, file_context, repo_structure, provider="openai", model=None):
        file_path = step.get("metadata", {}).get("file_path") if isinstance(step, dict) else None
        
        system_content = self.get_system_prompt(file_path)
        
        prompt = f"Plan:\n{plan}\n\nStep:\n{step}\n\nContext:\n{file_context}\n\nRepo:\n{repo_structure}"
        
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
        
        # Parse the response: Extract code (everything before the delimiter if it exists)
        code_part = full_response
        if "--- ARCHITECT_JUSTIFICATION ---" in full_response:
            code_part = full_response.split("--- ARCHITECT_JUSTIFICATION ---")[0].strip()
        
        # Strip any markdown code block indicators if the LLM added them despite instructions
        if code_part.startswith("```"):
            lines = code_part.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            code_part = "\n".join(lines).strip()
            
        return code_part
