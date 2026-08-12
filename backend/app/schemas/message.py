from typing import Literal

from pydantic import BaseModel, Field, field_validator


AiTonePreset = Literal["default", "professional", "friendly", "concise"]


class SendMessageRequest(BaseModel):
    content: str
    use_search: bool = False
    use_rag: bool = False
    ai_tone_preset: AiTonePreset = "default"
    ai_tone_custom_instruction: str = Field(default="", max_length=1000)

    @field_validator("ai_tone_custom_instruction")
    @classmethod
    def normalize_ai_tone_custom_instruction(cls, value: str) -> str:
        return value.strip()
