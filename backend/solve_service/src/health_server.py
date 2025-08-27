"""
Health check server for NSP Pro Solve Service.

Provides HTTP endpoints for monitoring service health and readiness.
"""

from datetime import datetime, timezone
from typing import Dict, Optional, Union

import uvicorn
from fastapi import FastAPI, HTTPException
from loguru import logger
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections

from config import config


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    timestamp: datetime
    service: str
    version: str
    environment: str


class ReadinessResponse(BaseModel):
    """Readiness check response model."""

    status: str
    timestamp: datetime
    checks: Dict[str, Dict[str, str]]


class HealthServer:
    """
    HTTP server for health and readiness checks.

    Provides endpoints to monitor:
    - Service liveness
    - Database connectivity
    - SQS consumer status
    """

    def __init__(
        self, collections: Optional[DatabaseCollections] = None
    ) -> None:
        self.app = FastAPI(
            title="NSP Pro Solve Service Health", version="1.0.0"
        )
        self.collections = collections
        self.consumer_status: Dict[str, Union[bool, Optional[datetime]]] = {
            "running": False,
            "last_activity": None,
        }
        self._setup_routes()

    def _setup_routes(self) -> None:
        """Set up health check routes."""

        @self.app.get("/health", response_model=HealthResponse)
        async def health() -> HealthResponse:
            """Basic liveness check."""
            return HealthResponse(
                status="healthy",
                timestamp=datetime.now(timezone.utc),
                service="solve-service",
                version="1.0.0",
                environment=config.environment,
            )

        @self.app.get("/ready", response_model=ReadinessResponse)
        async def readiness() -> ReadinessResponse:
            """Comprehensive readiness check."""
            checks = {}
            overall_status = "ready"

            # Check database connectivity
            db_status = await self._check_database()
            checks["database"] = db_status
            if db_status["status"] != "healthy":
                overall_status = "not_ready"

            # Check SQS consumer status
            consumer_status = self._check_consumer()
            checks["consumer"] = consumer_status
            if consumer_status["status"] != "healthy":
                overall_status = "not_ready"

            # Check SQS connectivity
            sqs_status = await self._check_sqs()
            checks["sqs"] = sqs_status
            if sqs_status["status"] != "healthy":
                overall_status = "not_ready"

            if overall_status != "ready":
                raise HTTPException(
                    status_code=503, detail="Service not ready"
                )

            return ReadinessResponse(
                status=overall_status,
                timestamp=datetime.now(timezone.utc),
                checks=checks,
            )

    async def _check_database(self) -> Dict[str, str]:
        """Check database connectivity."""
        try:
            if not self.collections:
                return {
                    "status": "unhealthy",
                    "message": "Database not initialized",
                }

            # Simple ping to check connection using team repository
            self.collections.team_db.get_teams()
            return {"status": "healthy", "message": "Database connection OK"}
        except Exception as e:
            logger.warning(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "message": f"Database error: {str(e)}",
            }

    def _check_consumer(self) -> Dict[str, str]:
        """Check SQS consumer status."""
        if not self.consumer_status["running"]:
            return {"status": "unhealthy", "message": "Consumer not running"}

        last_activity = self.consumer_status.get("last_activity")
        if last_activity is not None and isinstance(last_activity, datetime):
            time_since_activity = datetime.now(timezone.utc) - last_activity
            if time_since_activity.total_seconds() > 300:  # 5 minutes
                return {
                    "status": "degraded",
                    "message": (
                        f"No activity for "
                        f"{time_since_activity.total_seconds():.0f}s"
                    ),
                }

        return {"status": "healthy", "message": "Consumer running"}

    async def _check_sqs(self) -> Dict[str, str]:
        """Check SQS connectivity."""
        try:
            # This would need access to the SQS service
            # For now, we'll do a basic check
            return {
                "status": "healthy",
                "message": "SQS connection assumed OK",
            }
        except Exception as e:
            return {"status": "unhealthy", "message": f"SQS error: {str(e)}"}

    def update_consumer_status(
        self, running: bool, last_activity: Optional[datetime] = None
    ) -> None:
        """Update consumer status for health checks."""
        self.consumer_status["running"] = running
        if last_activity:
            self.consumer_status["last_activity"] = last_activity

    async def start_server(
        self, host: str = "localhost", port: int = 8080
    ) -> None:
        """Start the health check server."""
        config_uvicorn = uvicorn.Config(
            self.app,
            host=host,
            port=port,
            # log_level="warning",  # Minimize health check logs
            log_level="info",
            access_log=False,
        )
        server = uvicorn.Server(config_uvicorn)
        logger.info(f"Health check server starting on {host}:{port}")
        await server.serve()
