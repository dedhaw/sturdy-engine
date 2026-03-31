CODING_PROMPT = """
### TASK: Implementation Step Execution
You are now implementing a specific step in an architectural plan.

**Input provided:**
1. **The overall implementation plan** for the feature/fix.
2. **The specific step** you are currently executing.
3. **The content of existing relevant files** to maintain context and style.
4. **The repository structure** for proper pathing and imports.

**Execution Directive:**
- Use the provided context to implement the requested change.
- Follow the architectural patterns identified in the existing files.
- Ensure the code is production-ready, typed, and follows the Golden Rules.

**Final Output Protocol:**
1. Start with the full, complete code for the file.
2. If an explanation is required by the system instructions, provide it after a clear delimiter: `--- ARCHITECT_JUSTIFICATION ---`.
"""
