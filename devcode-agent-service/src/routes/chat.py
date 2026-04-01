from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from agents.chat_agent.agent import ChatAgent
from utils.step_tracker import StepStatus

router = APIRouter()
agent = ChatAgent()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = None
    stream: Optional[bool] = True
    provider: Optional[str] = "openai"
    session_id: Optional[str] = "default"
    repo_structure: Optional[str] = None
    base_path: Optional[str] = None

@router.post("/chat")
async def chat(request: ChatRequest):
    messages_list = [{"role": m.role, "content": m.content} for m in request.messages]
    return StreamingResponse(
        agent.run(
            messages=messages_list,
            session_id=request.session_id,
            provider=request.provider,
            model=request.model,
            stream=request.stream,
            repo_structure=request.repo_structure,
            base_path=request.base_path
        ), 
        media_type="text/plain"
    )

class StepApproveRequest(BaseModel):
    step_id: int
    base_path: str
    provider: Optional[str] = "openai"
    model: Optional[str] = None
    repo_structure: Optional[str] = None

@router.get("/chat/steps/{session_id}")
async def get_steps(session_id: str):
    tracker = agent.trackers.get(session_id)
    return {"steps": tracker.steps if tracker else []}

@router.post("/chat/steps/{session_id}/approve")
async def approve_step(session_id: str, request: StepApproveRequest):
    tracker = agent.trackers.get(session_id)
    if not tracker:
        return {"status": "error", "message": "Session not found"}
    
    tracker.update_step(request.step_id, StepStatus.APPROVED)
    
    # Trigger execution immediately after approval
    result = await agent.execute_step(
        session_id=session_id,
        step_id=request.step_id,
        base_path=request.base_path,
        provider=request.provider,
        model=request.model,
        repo_structure=request.repo_structure
    )
    
    return {
        "status": "success" if result["status"] else "failed",
        "message": "Step executed" if result["status"] else "Execution failed",
        "code": result.get("code"),
        "diff": result.get("diff")
    }
