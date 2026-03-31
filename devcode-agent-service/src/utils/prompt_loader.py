import os
from pathlib import Path

class PromptLoader:
    def __init__(self, base_dir=None):
        if base_dir is None:
            # Default to the raw_prompts/coding directory
            self.base_path = Path(__file__).parent.parent / "agents" / "raw_prompts" / "coding"
        else:
            self.base_path = Path(base_dir)

    def get_base_coding_prompt(self):
        """
        Loads the main coding agent system prompt.
        """
        return self._read_file("coding-agent-prompt.md")

    def get_prompt_for_file(self, file_path):
        """
        Determines the best architectural prompt based on file extension or path.
        """
        if not file_path:
            return ""

        ext = os.path.splitext(file_path)[1].lower()
        
        # Mapping for language specific overrides if they exist
        mapping = {
            ".py": "python.md",
            ".js": "javascript.md",
            ".ts": "typescript.md",
            ".tsx": "frameworks/react.md",
            ".jsx": "frameworks/react.md",
            ".java": "java.md"
        }

        prompt_file = mapping.get(ext)
        if prompt_file:
            override = self._read_file(prompt_file)
            if override:
                return override
        
        return ""

    def _read_file(self, rel_path):
        full_path = self.base_path / rel_path
        try:
            if full_path.exists():
                return full_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Error reading prompt file {full_path}: {e}")
        return ""
