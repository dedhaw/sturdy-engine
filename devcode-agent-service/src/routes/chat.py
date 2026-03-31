from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from agents.chat_agent.agent import ChatAgent

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
    # Convert Pydantic models to dicts for the agent
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
