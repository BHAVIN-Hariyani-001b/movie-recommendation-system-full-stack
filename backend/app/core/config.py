from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from dotenv import load_dotenv

load_dotenv()


class Setting(BaseSettings):
    API_KEY: str = os.getenv("TMDB_API_KEY", None)
    TMDB_BASE_URL: str = os.getenv("TMDB_BASE_URL", None)
    TMDB_IMAGE_BASE_URL: str = os.getenv("TMDB_IMAGE_BASE_URL", None)
    PLACEHOLDER: str = "https://via.placeholder.com/500x750?text=No+Poster"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Setting()
