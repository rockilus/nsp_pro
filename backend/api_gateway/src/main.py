import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from src.app import create_app
from src.config import config
from src.database_setup import setup_database, shutdown_database

# Global variable to store database collections
_db_collections = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for database setup and cleanup."""
    global _db_collections

    # Startup
    try:
        _db_collections = await setup_database()
        app.state.db_collections = _db_collections
        yield
    finally:
        # Shutdown
        await shutdown_database()


def create_application() -> FastAPI:
    """Create FastAPI application with database dependency."""
    return create_app(lifespan=lifespan)


# Create the app at module level for uvicorn
app = create_application()


async def start_app() -> None:
    """Start the FastAPI application."""
    # Setup database first
    global _db_collections
    if _db_collections is None:
        _db_collections = await setup_database()

    # Create config for uvicorn
    uvicorn_config = uvicorn.Config(
        app="src.main:app",
        host=config.api_domain,
        port=config.api_port,
        reload=config.uvicorn_reload,
        access_log=False,
    )

    server = uvicorn.Server(uvicorn_config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(start_app())
