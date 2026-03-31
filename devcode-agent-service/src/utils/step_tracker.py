import uuid
from enum import Enum

class StepStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"

class StepTracker:
    def __init__(self):
        self.steps = []
        self.current_session_id = str(uuid.uuid4())

    def add_step(self, description, action_type="info", metadata=None):
        step = {
            "id": len(self.steps) + 1,
            "description": description,
            "type": action_type,
            "status": StepStatus.PENDING.value,
            "metadata": metadata or {}
        }
        self.steps.append(step)
        return step

    def update_step(self, step_id, status, metadata=None):
        for step in self.steps:
            if step["id"] == step_id:
                step["status"] = status.value if isinstance(status, StepStatus) else status
                if metadata:
                    step["metadata"].update(metadata)
                return step
        return None

    def get_summary(self):
        summary = "Implementation Steps Taken:\n"
        for step in self.steps:
            summary += f"- [{step['status'].upper()}] {step['description']}\n"
        return summary

    def get_pending_step(self):
        for step in self.steps:
            if step["status"] == StepStatus.PENDING.value:
                return step
        return None
