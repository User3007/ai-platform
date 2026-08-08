from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    content: str
    use_search: bool = False
    use_rag: bool = False
