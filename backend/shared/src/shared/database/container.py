"""
Modern database container for NSP Pro services.
Provides dependency injection container for database access.
"""

from typing import Dict, Optional

from .config import DatabaseConfig
from .factory import DatabaseFactory
from .interface import DatabaseInterface


class DatabaseContainer:
    """Container for managing database instances with dependency injection."""

    _instance: Optional["DatabaseContainer"] = None  # Singleton instance

    def __init__(self):
        """Initialize database container."""
        self._instances: Dict[str, DatabaseInterface] = {}
        self._configs: Dict[str, DatabaseConfig] = {}

    @classmethod
    def get_instance(cls) -> "DatabaseContainer":
        """Get or create the singleton instance of DatabaseContainer."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset the singleton instance."""
        cls._instance = None

    def register_config(self, name: str, config: DatabaseConfig) -> None:
        """Register a database configuration."""
        self._configs[name] = config

    async def get_database(self, name: str = "default") -> DatabaseInterface:
        """Get database instance by name."""
        if name not in self._instances:
            if name not in self._configs:
                raise ValueError(f"No configuration found for database: {name}")

            config = self._configs[name]
            provider = await DatabaseFactory.create_and_connect(config)
            self._instances[name] = provider

        return self._instances[name]

    async def disconnect_all(self) -> None:
        """Disconnect all database instances."""
        for instance in self._instances.values():
            await instance.disconnect()
        self._instances.clear()

    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all database instances."""
        results = {}
        for name, instance in self._instances.items():
            results[name] = await instance.health_check()
        return results


async def get_database(name: str = "default") -> DatabaseInterface:
    """Get database instance from global container."""
    container = DatabaseContainer.get_instance()
    return await container.get_database(name)


def setup_database_config(config: DatabaseConfig, name: str = "default") -> None:
    """Setup database configuration in global container."""
    container = DatabaseContainer.get_instance()
    container.register_config(name, config)


async def shutdown_databases() -> None:
    """Shutdown all database connections."""
    container = DatabaseContainer.get_instance()
    await container.disconnect_all()
    DatabaseContainer.reset_instance()
