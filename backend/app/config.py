from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    AWS_PROFILE: str = "default"
    AWS_DEFAULT_REGION: str = "us-east-1"
    AWS_ORG_MEMBER_ROLE_NAME: str = "OrganizationAccountAccessRole"
    ORG_SCAN_CONCURRENCY: int = 4
    LOG_LEVEL: str = "INFO"
    SUPPRESS_HEALTHCHECK_ACCESS_LOGS: bool = True

    @property
    def is_development(self) -> bool:
        return self.LOG_LEVEL.upper() == "DEBUG"


settings = Settings()
