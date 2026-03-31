from agents.base_agent import BaseAgent
from agents.chat_agent.prompts import MASTERPROMPT
from agents.context_manager import ContextManager
from agents.intent_agent.agent import IntentAgent
from agents.planner_agent.agent import PlannerAgent
from agents.coding_agent.agent import CodingAgent
from utils.ollama_manager import OllamaManager
from utils.file_reader import read_files_for_context, write_file_content
from utils.step_tracker import StepTracker, StepStatus
import os
import json
import difflib

class ChatAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.sessions = {}
        self.trackers = {}
        self.ollama_manager = OllamaManager()
        self.intent_agent = IntentAgent()
        self.planner_agent = PlannerAgent()
        self.coding_agent = CodingAgent()

    def get_system_prompt(self, repo_structure=None, step_summary=None):
        prompt = MASTERPROMPT
        if repo_structure:
            prompt += f"\n\nCurrent Repository Structure:\n{repo_structure}"
        if step_summary:
            prompt += f"\n\n{step_summary}"
        return prompt

    async def run(self, messages, session_id="default", provider="openai", model=None, stream=True, repo_structure=None, base_path=None):
        self.log("chat_agent", f"Run started. Base Path: {base_path}")
        print(f"\n[CHAT_AGENT] Starting run for session {session_id}")

        if messages:
            user_query = messages[-1].get('content', '')
            self.log("chat_agent", f"User Query: {user_query}")
            print(f"[CHAT_AGENT] User Query: {user_query}")
        
        if session_id not in self.sessions:
            self.sessions[session_id] = ContextManager(max_context=15)
            self.trackers[session_id] = StepTracker()
        
        cm = self.sessions[session_id]
        tracker = self.trackers[session_id]
        
        if messages:
            last_msg = messages[-1]
            role = last_msg.get('role', 'user')
            content = last_msg.get('content', '')
            
            if repo_structure and base_path:
                yield json.dumps({"type": "status", "content": "Classifying intent"}) + "\n"
                # Pass managed messages for full context
                intent = await self.intent_agent.analyze(cm.get_messages() + [{"role": "user", "content": content}], repo_structure, provider=provider, model=model)
                print(f"[INTENT_AGENT] Result: {json.dumps(intent, indent=2)}")
                
                if intent.get("should_delegate") and "planner_agent" in intent.get("target_agents", []):
                    yield json.dumps({"type": "status", "content": "Planning implementation"}) + "\n"
                    # Pass managed messages for full context
                    plan = await self.planner_agent.create_plan(cm.get_messages() + [{"role": "user", "content": content}], repo_structure, provider=provider, model=model)
                    print(f"[PLANNER_AGENT] Plan: {json.dumps(plan, indent=2)}")
                    if plan:
                        new_steps = []
                        for i, p_step in enumerate(plan):
                            step = tracker.add_step(
                                description=f"{p_step['action'].capitalize()} {p_step['file_path']}: {p_step['description']}",
                                action_type=p_step['action'],
                                metadata={"file_path": p_step['file_path'], "plan": plan}
                            )
                            step["file_path"] = p_step['file_path'] # Add at top level
                            new_steps.append(step)
                            print(f"[PLANNER_AGENT] Step {i+1}: {step['description']}")

                        yield json.dumps({"type": "plan", "steps": new_steps}) + "\n"
                        return

                files_to_read = intent.get("files_to_read", [])
                if files_to_read:
                    print(f"[CHAT_AGENT] Reading files for context: {files_to_read}")
                    file_context = read_files_for_context(files_to_read, base_path)
                    if file_context:
                        messages.insert(-1, {"role": "system", "content": f"Context from existing files:\n{file_context}"})

            await cm.add_message(role=role, content=content, provider=provider, model=model)

        managed_messages = cm.get_messages()
        system_content = self.get_system_prompt(repo_structure, tracker.get_summary())
        
        if managed_messages and managed_messages[0].get('role') == 'system':
            managed_messages[0]['content'] = system_content
        else:
            managed_messages.insert(0, {"role": "system", "content": system_content})

        if provider == "ollama":
            self.ollama_manager.start_server()

        yield json.dumps({"type": "status", "content": "Generating response"}) + "\n"
        full_response = ""
        async for token in super().run(messages=managed_messages, provider=provider, model=model, stream=stream):
            full_response += token
            yield json.dumps({"type": "chunk", "content": token}) + "\n"
        
        if full_response:
            print(f"[CHAT_AGENT] Full Response: {full_response[:100]}...")
            await cm.add_message(role="assistant", content=full_response, provider=provider, model=model)

    async def execute_step(self, session_id, step_id, base_path, provider="openai", model=None, repo_structure=None):
        tracker = self.trackers.get(session_id)
        if not tracker: return {"status": False, "message": "Tracker not found"}
        
        step = next((s for s in tracker.steps if s["id"] == step_id), None)
        if not step: return {"status": False, "message": "Step not found"}

        print(f"\n[CODING_AGENT] Executing step {step_id}: {step['description']}")
        plan = step["metadata"].get("plan")
        file_path = step["metadata"].get("file_path")
        
        # Read old content for diffing
        full_path = os.path.join(base_path, file_path)
        old_code = ""
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    old_code = f.read()
            except Exception:
                pass

        print(f"[CODING_AGENT] Reading context for {file_path}")
        file_context = read_files_for_context([file_path], base_path)
        
        print(f"[CODING_AGENT] Generating code...")
        cm = self.sessions.get(session_id)
        history = cm.get_messages() if cm else []
        
        new_code = await self.coding_agent.generate_code(
            plan=plan, 
            step=step, 
            file_context=file_context, 
            repo_structure=repo_structure,
            history=history,
            provider=provider,
            model=model
        )
        
        # Generate Diff with context
        diff_list = list(difflib.unified_diff(
            old_code.splitlines(keepends=True),
            new_code.splitlines(keepends=True),
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            n=3
        ))
        diff = "".join(diff_list)

        print(f"[CODING_AGENT] Implementation complete. Writing to {file_path}")
        success = write_file_content(file_path, new_code, base_path)
        if success:
            print(f"[CODING_AGENT] Successfully updated {file_path}")
            tracker.update_step(step_id, StepStatus.COMPLETED)
        else:
            print(f"[CODING_AGENT] Failed to update {file_path}")
            tracker.update_step(step_id, StepStatus.FAILED)
        
        return {
            "status": success, 
            "code": new_code,
            "diff": diff
        }
