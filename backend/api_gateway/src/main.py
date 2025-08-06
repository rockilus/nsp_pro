import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from shared.logger import log_error, log_info

from src.app import create_app
from src.config import config
from src.database_setup import setup_database, shutdown_database


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """Application lifespan manager for database setup and cleanup."""
    # Startup
    try:
        log_info("Starting API Gateway database setup...")
        db_collections = await setup_database()
        fastapi_app.state.db_collections = db_collections
        log_info("API Gateway database setup completed successfully")
        yield
    except Exception as e:
        log_error(f"Failed to setup database during startup: {str(e)}")
        raise
    finally:
        # Shutdown
        try:
            log_info("Shutting down API Gateway database connections...")
            await shutdown_database()
            log_info("API Gateway database shutdown completed")
        except Exception as e:
            log_error(f"Error during database shutdown: {str(e)}")


def create_application() -> FastAPI:
    """Create FastAPI application with database dependency."""
    return create_app(lifespan=lifespan)


# Create the app at module level for uvicorn
app = create_application()


async def start_app() -> None:
    """Start the FastAPI application."""
    log_info("Starting NSP Pro API Gateway server...")

    try:
        # Create config for uvicorn
        uvicorn_config = uvicorn.Config(
            app="src.main:app",
            host=config.api_domain,
            port=config.api_port,
            reload=config.uvicorn_reload,
            access_log=False,
            log_level="info",
        )

        server = uvicorn.Server(uvicorn_config)
        await server.serve()

    except KeyboardInterrupt:
        log_info("Received shutdown signal, stopping API Gateway server...")
    except Exception as e:
        log_error(f"API Gateway server error: {str(e)}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(start_app())
    except Exception as e:
        log_error(f"Failed to start API Gateway: {str(e)}")
        raise
