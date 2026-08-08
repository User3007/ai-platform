from pydantic import BaseModel, Field, field_validator


class SystemPromptResponse(BaseModel):
    system_prompt: str


class UpdateSystemPromptRequest(BaseModel):
    system_prompt: str = Field(max_length=12000)

    @field_validator("system_prompt")
    @classmethod
    def normalize_system_prompt(cls, value: str) -> str:
        return value.strip()