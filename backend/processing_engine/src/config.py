import os

from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings

# Determine the environment-specific .env file
default_env_file = os.path.join(os.path.dirname(__file__), ".env.development")
env_file = os.getenv("ENV_FILE", default_env_file)
env_file_loaded = load_dotenv(env_file)
print(f"env_file_loaded: {env_file_loaded}")


class AppConfig(BaseSettings):
    """
    Configuration class for the application.
    Validates and loads environment variables.
    """

    redis_url: str = Field(..., description="Redis connection URL")
    result_backend: str = Field(
        ..., description="Redis URL for result backend"
    )
    log_level: str = Field(
        "INFO",
        description="Logging level",
        pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$",
    )

    # pylint: disable=too-few-public-methods
    class Config:
        env_file = env_file


# Instantiate the configuration
try:
    config = AppConfig()  # type: ignore
except ValidationError as e:
    print(f"Configuration validation failed: {e}")
    raise


# class AppConfig(BaseSettings):
#     redis_url: str = "redis://localhost:6379/0"
#     result_backend: str = "redis://localhost:6379/1"

#     class Config:
#         env_file = ".env"
