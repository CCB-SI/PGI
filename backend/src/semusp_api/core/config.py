from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SEMUSP API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

settings = Settings()
