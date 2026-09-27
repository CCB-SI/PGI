from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

JWT_SECRET_MIN_LENGTH = 32

class Settings(BaseSettings):
    PROJECT_NAME: str = "Gestão de Comunicados API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Segredo que assina o login (JWT). Sem valor padrão: o backend não sobe sem ele.
    # Nasce no servidor, no backend/.env (docs/DEPLOY.md).
    JWT_SECRET_KEY: SecretStr

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # AWS S3
    AWS_S3_ENABLED: bool = True
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_PUBLIC_BASE_URL: str = ""
    
    # hide_input_in_errors: erro de configuração não repete no log o valor lido (há segredo aqui)
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, hide_input_in_errors=True)

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_long_enough(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < JWT_SECRET_MIN_LENGTH:
            raise ValueError(
                f"precisa de pelo menos {JWT_SECRET_MIN_LENGTH} caracteres; gere com: openssl rand -hex 32"
            )
        return value

settings = Settings()
