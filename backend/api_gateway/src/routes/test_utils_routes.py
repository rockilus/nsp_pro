"""
Test utilities endpoints - ONLY available in test environments.

These endpoints provide testing utilities such as database reset functionality.
They include multiple safety mechanisms to prevent accidental use in
production.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from loguru import logger

from shared.database.reset_service import (
    DatabaseResetService,
    DatabaseResetError,
)
from src.config import config


def get_database_interface(request: Request):
    """Get database interface from app state."""
    db_collections = request.app.state.db_collections
    return db_collections.database_interface


class DatabaseResetRequest(BaseModel):
    """Request model for database reset operations."""

    collections: Optional[List[str]] = None
    preserve_system_data: bool = True
    confirmation_token: str = "test-reset-confirm"


class DatabaseResetResponse(BaseModel):
    """Response model for database reset operations."""

    success: bool
    message: str
    collections_reset: List[str]
    timestamp: str
    operation_id: str


router = APIRouter(prefix="/test-utils", tags=["test-utilities"])


async def get_test_environment_only() -> None:
    """
    Dependency that ensures endpoint only works in test environments.

    Raises:
        HTTPException: If not in test environment
    """
    environment = config.environment.lower()

    # Check environment
    if environment not in ["test", "testing", "local", "development"]:
        logger.warning(
            f"Test utilities access denied for environment: {environment}"
        )
        raise HTTPException(
            status_code=403,
            detail="Test utilities are only available in test environments",
        )

    # Additional check for database name patterns
    db_name = getattr(config, 'mongodb_database_name', '').lower()
    if "prod" in db_name:
        logger.warning(f"Test utilities access denied for database: {db_name}")
        raise HTTPException(
            status_code=403,
            detail="Cannot run test utilities against production database",
        )

    logger.info(
        f"Test utilities access granted for environment: {environment}"
    )


@router.post("/reset-database", response_model=DatabaseResetResponse)
async def reset_database_endpoint(
    request: DatabaseResetRequest,
    _: None = Depends(get_test_environment_only),
    db_interface=Depends(get_database_interface),
) -> DatabaseResetResponse:
    """
    Reset database for testing purposes.

    This endpoint allows resetting all or specific database collections.
    It includes multiple safety checks to prevent accidental use in production.

    Args:
        request: Database reset request parameters
        _: Test environment validation dependency
        db_interface: Database interface dependency

    Returns:
        DatabaseResetResponse with operation results

    Raises:
        HTTPException: If operation fails or safety checks fail
    """
    try:
        # Validate confirmation token
        if request.confirmation_token != "test-reset-confirm":
            logger.warning("Invalid confirmation token provided")
            raise HTTPException(
                status_code=400, detail="Invalid confirmation token"
            )

        logger.info(
            f"Database reset requested: collections={request.collections}, "
            f"preserve_system_data={request.preserve_system_data}"
        )

        # Create reset service with the database interface
        reset_service = DatabaseResetService(db_interface)

        # Perform the reset operation
        if request.collections is None:
            result = await reset_service.reset_all_collections()
        else:
            result = await reset_service.reset_specific_collections(
                request.collections
            )

        logger.info(f"Database reset completed: {result['operation_id']}")

        return DatabaseResetResponse(
            success=result["success"],
            message=result["message"],
            collections_reset=result["collections_reset"],
            timestamp=result["timestamp"],
            operation_id=result["operation_id"],
        )

    except DatabaseResetError as e:
        logger.error(f"Database reset failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Database reset failed: {str(e)}"
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error during database reset: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during database reset",
        ) from e


@router.get("/reset-database/dry-run")
async def dry_run_reset_database(
    collections: Optional[str] = None,
    _: None = Depends(get_test_environment_only),
    db_interface=Depends(get_database_interface),
) -> dict:
    """
    Preview what collections would be reset without actually resetting them.

    Args:
        collections: Comma-separated list of collection names (optional)
        _: Test environment validation dependency
        db_interface: Database interface dependency

    Returns:
        Dict with collections that would be reset
    """
    try:
        collection_list = None
        if collections:
            collection_list = [c.strip() for c in collections.split(",")]

        reset_service = DatabaseResetService(db_interface)
        collections_to_reset = await reset_service.get_collections_to_reset(
            collection_list
        )

        return {
            "collections_to_reset": collections_to_reset,
            "total_count": len(collections_to_reset),
            "requested_collections": collection_list,
            "dry_run": True,
        }

    except Exception as e:
        logger.error(f"Dry run failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Dry run failed: {str(e)}"
        ) from e


@router.get("/health")
async def test_utils_health() -> dict:
    """
    Health check endpoint for test utilities.

    Returns:
        Dict with health status
    """
    return {
        "status": "healthy",
        "environment": config.environment,
        "test_utilities_available": config.environment.lower()
        in ["test", "testing", "local", "development"],
    }
