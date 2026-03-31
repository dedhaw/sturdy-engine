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
1. Provide the **RAW implementation code** first.
2. **STRICT RULE:** No markdown code blocks (no \`\`\`).
3. If you need to provide an architectural justification, you **MUST** place it at the very end of your response, wrapped in these exact tags:
<justification>
[Your explanation here]
</justification>
"""

