from pydantic import BaseModel


class CreateModelRequest(BaseModel):
    display_name: str
    model_id: str
    provider_name: str
    base_url: str
    api_key_ref: str | None = None
    api_key: str
    context_length: int


class UpdateModelRequest(BaseModel):
    display_name: str | None = None
    model_id: str | None = None
    provider_name: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    context_length: int | None = None
    is_active: bool | None = None
