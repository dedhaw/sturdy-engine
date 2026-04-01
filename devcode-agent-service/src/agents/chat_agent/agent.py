from agents.base_agent import BaseAgent
from agents.chat_agent.prompts import MASTERPROMPT
from agents.context_manager import ContextManager
from agents.intent_agent.agent import IntentAgent
from agents.planner_agent.agent import PlannerAgent
from agents.coding_agent.agent import CodingAgent
from utils.ollama_manager import OllamaManager
from utils.file_reader import read_files_for_context, write_file_content
from utils.step_tracker import StepTracker, StepStatus
from utils.code_search import search_codebase, format_search_results
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

        if session_id not in self.sessions:
            self.sessions[session_id] = ContextManager(max_context=15)
            self.trackers[session_id] = StepTracker()
        
        cm = self.sessions[session_id]
        tracker = self.trackers[session_id]
        
        content = ""
        if messages:
            last_msg = messages[-1]
            content = last_msg.get('content', '')
            role = last_msg.get('role', 'user')
            
            if role == "user" and repo_structure and base_path:
                yield json.dumps({"type": "status", "content": "Classifying intent"}) + "\n"
                intent = await self.intent_agent.analyze(cm.get_messages() + [{"role": "user", "content": content}], repo_structure, provider=provider, model=model)
                self.log("chat_agent", f"Intent: {json.dumps(intent, indent=2)}")
                
                search_context = ""
                search_queries = intent.get("search_queries", [])
                if search_queries:
                    yield json.dumps({"type": "status", "content": "Searching codebase"}) + "\n"
                    for query in search_queries:
                        results = search_codebase(query, base_path)
                        search_context += format_search_results(results) + "\n"
                    
                    if search_context:
                        messages.insert(-1, {"role": "system", "content": f"Information found via code search:\n{search_context}"})

                if intent.get("should_delegate") and "planner_agent" in intent.get("target_agents", []):
                    yield json.dumps({"type": "status", "content": "Planning implementation"}) + "\n"
                    current_messages = cm.get_messages() + [{"role": "user", "content": content}]
                    if search_context:
                        current_messages.insert(-1, {"role": "system", "content": f"Information found via code search:\n{search_context}"})
                    
                    plan = await self.planner_agent.create_plan(current_messages, repo_structure, provider=provider, model=model)
                    self.log("chat_agent", f"Plan: {json.dumps(plan, indent=2)}")

                    if plan:
                        new_steps = []
                        for i, p_step in enumerate(plan):
                            step = tracker.add_step(
                                description=f"{p_step['action'].capitalize()} {p_step['file_path']}: {p_step['description']}",
                                action_type=p_step['action'],
                                metadata={"file_path": p_step['file_path'], "plan": plan}
                            )
                            step["file_path"] = p_step['file_path']
                            new_steps.append(step)

                        yield json.dumps({"type": "plan", "steps": new_steps}) + "\n"
                        return

                files_to_read = intent.get("files_to_read", [])
                if files_to_read:
                    file_context = read_files_for_context(files_to_read, base_path)
                    if file_context:
                        messages.insert(-1, {"role": "system", "content": f"Context from existing files:\n{file_context}"})

            await cm.add_message(role=role, content=content, provider=provider, model=model)

        managed_messages = cm.get_messages()
        system_content = self.get_system_prompt(repo_structure, tracker.get_summary())
        final_messages = [{"role": "system", "content": system_content}]
        final_messages.extend(managed_messages)
        
        if provider == "ollama":
            self.ollama_manager.start_server()

        yield json.dumps({"type": "status", "content": "Generating response"}) + "\n"
        full_response = ""
        async for token in super().run(messages=final_messages, provider=provider, model=model, stream=stream):
            full_response += token
            yield json.dumps({"type": "chunk", "content": token}) + "\n"
        
        if full_response:
            self.log("chat_agent", f"Full Response: {full_response}")
            await cm.add_message(role="assistant", content=full_response, provider=provider, model=model)

    async def execute_step(self, session_id, step_id, base_path, provider="openai", model=None, repo_structure=None):
        tracker = self.trackers.get(session_id)
        if not tracker: return {"status": False, "message": "Tracker not found"}
        
        step = next((s for s in tracker.steps if s["id"] == step_id), None)
        if not step: return {"status": False, "message": "Step not found"}

        self.log("chat_agent", f"Executing step {step_id}: {step['description']}")
        plan = step["metadata"].get("plan")
        file_path = step["metadata"].get("file_path")
        
        full_path = os.path.join(base_path, file_path)
        old_code = ""
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    old_code = f.read()
            except Exception:
                pass

        file_context = read_files_for_context([file_path], base_path)
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
        
        def normalize(text):
            if not text: return ""
            return text if text.endswith('\n') else text + '\n'

        old_norm = normalize(old_code)
        new_norm = normalize(new_code)

        diff = "".join(difflib.unified_diff(
            old_norm.splitlines(keepends=True),
            new_norm.splitlines(keepends=True),
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            n=3
        ))

        success = write_file_content(file_path, new_code, base_path)
        if success:
            tracker.update_step(step_id, StepStatus.COMPLETED)
        else:
            tracker.update_step(step_id, StepStatus.FAILED)
        
        return {
            "status": success, 
            "code": new_code,
            "diff": diff
        }
