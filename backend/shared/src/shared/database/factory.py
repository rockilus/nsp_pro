"""
Modern database factory for NSP Pro services.
Creates database providers based on configuration with async support.
"""

from typing import TYPE_CHECKING

from .config import DatabaseConfig, DatabaseType
from .interface import DatabaseInterface

if TYPE_CHECKING:
    from .providers import DocumentDBProvider, MongoDBProvider


class DatabaseFactory:
    """Factory for creating database providers."""

    @staticmethod
    def create_provider(config: DatabaseConfig) -> DatabaseInterface:
        """Create database provider based on configuration."""
        if config.database_type == DatabaseType.MONGODB:
            from .providers import MongoDBProvider

            return MongoDBProvider(config)
        elif config.database_type == DatabaseType.DOCUMENTDB:
            from .providers import DocumentDBProvider

            return DocumentDBProvider(config)
        else:
            raise ValueError(
                f"Unsupported database type: {config.database_type}"
            )

    @classmethod
    async def create_and_connect(
        cls, config: DatabaseConfig
    ) -> DatabaseInterface:
        """Create and connect database provider."""
        provider = cls.create_provider(config)
        await provider.connect()
        return provider
