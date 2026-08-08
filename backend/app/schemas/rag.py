from datetime import datetime

from pydantic import BaseModel


class RagDocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    content_type: str
    size_bytes: int
    status: str
    error_message: str | None = None
    page_count: int | None = None
    chunk_count: int
    uploaded_by_email: str | None = None
    created_at: datetime
    updated_at: datetime


class RagDocumentListResponse(BaseModel):
    items: list[RagDocumentResponse]


class RagCitation(BaseModel):
    document_id: str
    document_name: str
    chunk_index: int
    content: str
    score: float | None = None
