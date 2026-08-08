from functools import cached_property
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_env: str = Field(default="development", alias="APP_ENV")
    debug: bool = Field(default=True, alias="DEBUG")
    database_url: str = Field(alias="DATABASE_URL")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_access_expire_minutes: int = Field(default=30, alias="JWT_ACCESS_EXPIRE_MINUTES")
    jwt_refresh_expire_days: int = Field(default=7, alias="JWT_REFRESH_EXPIRE_DAYS")
    config_file_path: str = Field(default="config/api_keys.yaml", alias="CONFIG_FILE_PATH")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")
    allowed_registration: bool = Field(default=False, alias="ALLOWED_REGISTRATION")
    max_history_tokens: int = Field(default=6000, alias="MAX_HISTORY_TOKENS")
    rag_upload_dir: str = Field(default="uploads/rag", alias="RAG_UPLOAD_DIR")
    rag_max_file_size_mb: int = Field(default=10, alias="RAG_MAX_FILE_SIZE_MB")
    rag_chunk_size: int = Field(default=1200, alias="RAG_CHUNK_SIZE")
    rag_chunk_overlap: int = Field(default=200, alias="RAG_CHUNK_OVERLAP")
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env.example", BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def rag_upload_path(self) -> Path:
        path = Path(self.rag_upload_dir)
        if path.is_absolute():
            return path
        return BASE_DIR / path

    @cached_property
    def api_keys(self) -> dict[str, Any]:
        config_path = Path(self.config_file_path)
        if not config_path.exists():
            return {}
        with config_path.open("r", encoding="utf-8") as file:
            return yaml.safe_load(file) or {}

    def save_api_keys(self, config: dict[str, Any]) -> None:
        config_path = Path(self.config_file_path)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with config_path.open("w", encoding="utf-8") as file:
            yaml.safe_dump(config, file, sort_keys=False)
        self.__dict__.pop("api_keys", None)


settings = Settings()
