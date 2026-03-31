from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio
from typing import List, Optional
from dotenv import load_dotenv
import os

from agents.chat_agent import ChatAgent

load_dotenv()

app = FastAPI(title="DevCode Backend")
agent = ChatAgent()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = None
    stream: Optional[bool] = True
    provider: Optional[str] = "openai"

@app.get("/")
async def root():
    return {"status": "ok", "message": "DevCode Backend is running"}

@app.post("/chat")
async def chat(request: ChatRequest):
    # Convert Pydantic messages to list of dicts for the AI clients
    messages_list = [{"role": m.role, "content": m.content} for m in request.messages]
    
    return StreamingResponse(
        agent.run(
            messages=messages_list,
            provider=request.provider,
            model=request.model,
            stream=request.stream
        ), 
        media_type="text/plain"
    )

if __name__ == "__main__":
    import uvicorn
    # When running directly, we need to be in the parent directory or add it to sys.path
    uvicorn.run(app, host="127.0.0.1", port=8000)
