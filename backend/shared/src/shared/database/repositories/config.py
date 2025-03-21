from shared.database.repositories.base import BaseRepository
from shared.database.schemas.config import ConfigSchema
from shared.schemas.schemas.config import Config


class ConfigRepository(BaseRepository[ConfigSchema]):
    """Repository for config documents using PyMongo."""

    def __init__(self):
        super().__init__("config", ConfigSchema)

    def create_config(self, config: Config) -> Config:
        """Create a new config."""
        config_schema = ConfigSchema.from_core(config)
        result = self.create(config_schema)
        return result.to_core()

    def get_config(self) -> Config | None:
        """Get the config document."""
        config = self.find_all(limit=1)
        if not config:
            return None
        return config[0].to_core()

    def update_config(self, config: Config) -> Config:
        """Update the config document."""
        config_schema = ConfigSchema.from_core(config)
        config_updated = self.update(config_schema)
        assert config_updated is not None
        return config_updated.to_core()

    def add_signup_email_attempt(self, email: str) -> Config:
        """Add a signup email attempt to the config."""
        config = self.get_config()
        if config is None:
            raise Exception("Config not found in database")
        config.signup_emails_attempt.append(email)
        return self.update_config(config)
