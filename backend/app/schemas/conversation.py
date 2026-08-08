from pydantic import BaseModel


class CreateConversation(BaseModel):
    model_id: str | None = None
    title: str | None = None
