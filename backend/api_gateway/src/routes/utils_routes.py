"""
Test utilities endpoints - ONLY available in test environments.

These endpoints provide testing utilities such as database reset functionality.
They include multiple safety mechanisms to prevent accidental use in
production.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from loguru import logger
from pydantic import BaseModel
from shared.augment import cb_to_cb_augmented, r_to_r_augmented
from shared.database.reset_service import (
    DatabaseResetError,
    DatabaseResetService,
)
from shared.logger import log_info
from shared.schemas.core import TeamMembership, TeamMembershipRole

from src.config import config
from src.dependencies import get_test_service, get_user_context
from src.errors import NotAuthorizedError
from src.integrations.authorization import (
    authz_check,
    authz_delete_all_instances,
)
from src.security.user_context import UserContext
from src.services.team_membership_service import TeamMembershipService
from src.services.test_service import SolverTestScenariosService


def get_database_interface(request: Request):
    """Get database interface from app state."""
    db_collections = request.app.state.db_collections
    return db_collections.database_interface


def get_team_membership_service(request: Request) -> TeamMembershipService:
    """Get team membership service from app state."""
    db_collections = request.app.state.db_collections
    return TeamMembershipService(collection=db_collections)


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
    environment = str(config.environment).lower()

    # Check environment
    if environment not in ["test", "testing", "local", "development"]:
        logger.warning(f"Test utilities access denied for environment: {environment}")
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

    logger.info(f"Test utilities access granted for environment: {environment}")


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
            raise HTTPException(status_code=400, detail="Invalid confirmation token")

        logger.info(
            f"Database reset requested: collections={request.collections}, "
            f"preserve_system_data={request.preserve_system_data}"
        )

        # Create reset service with the database interface
        reset_service = DatabaseResetService(db_interface)

        # Perform the reset operation
        if request.collections is None:
            result = await reset_service.reset_all_collections()
            await authz_delete_all_instances()  # Delete all instances in authz
        else:
            result = await reset_service.reset_specific_collections(request.collections)
            if "users" in request.collections:
                await authz_delete_all_instances()

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
        raise HTTPException(status_code=500, detail=f"Dry run failed: {str(e)}") from e


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
        "test_utilities_available": config.environment
        in ["test", "testing", "local", "development"],
    }


class ScenarioLoadRequest(BaseModel):
    """Request model for loading test scenarios."""

    scenario_name: str
    team_id: str


@router.post(
    "/scenarios/load",
    #   response_model=ScenarioLoadResponse
)
async def load_test_scenario(
    request: ScenarioLoadRequest,
    user_context: UserContext = Depends(get_user_context),
    test_service: SolverTestScenariosService = Depends(get_test_service),
) -> Dict:
    try:
        if not await authz_check(
            user_context.user_id, "create-worker", "team", request.team_id
        ):
            log_info(
                f"Authorization denied for user {user_context.user_id} "
                f"to create worker in team {request.team_id}"
            )
            raise NotAuthorizedError("You do not have permission to create a worker")
        log_info(
            f"Loading test scenario '{request.scenario_name}' "
            f"for team '{request.team_id}'"
        )

        # Get scenario data
        try:
            scenario = test_service.create_scenario(
                scenario_name=request.scenario_name, team_id=request.team_id
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e

        cbs_augmented = [
            cb_to_cb_augmented(
                cb=cb,
                workers=scenario.workers,
                shifts=scenario.shifts,
                dimensions=scenario.dimensions,
                dim_entries=scenario.dim_entries,
                attributes=scenario.attributes,
                specialties=scenario.specialties,
            )
            for cb in scenario.constraints
        ]

        rs_augmented = [
            r_to_r_augmented(
                request=r,
                worker=next((w for w in scenario.workers if w.id == r.worker_id), None),
                shifts=scenario.shifts,
                dimensions=scenario.dimensions,
                dim_entries=scenario.dim_entries,
                attributes=scenario.attributes,
            )
            for r in scenario.requests
        ]

        return {
            "scenario_name": scenario.scenario_name,
            "specialties": [s.to_dto() for s in scenario.specialties],
            "workers": [w.to_dto(attributes=[]) for w in scenario.workers],
            "shifts": [s.to_dto(attributes=[]) for s in scenario.shifts],
            "link_shifts": [ls.to_dto() for ls in scenario.link_shifts],
            "dimensions": [d.to_dto() for d in scenario.dimensions],
            "dim_entries": [de.to_dto() for de in scenario.dim_entries],
            "attributes": [a.to_dto() for a in scenario.attributes],
            "shift_demand_templates": [
                sdt.to_dto() for sdt in scenario.shift_demand_templates
            ],
            "shift_demands": [sd.to_dto() for sd in scenario.shift_demands],
            "constraints": [c.to_dto() for c in cbs_augmented],
            "requests": [r.to_dto() for r in rs_augmented],
            "schedules": [s.to_dto() for s in scenario.schedules],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to load scenario: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load scenario: {str(e)}",
        ) from e


@router.get("/scenarios")
async def list_scenarios(
    _: UserContext = Depends(get_user_context),
    test_service: SolverTestScenariosService = Depends(get_test_service),
) -> List[str]:
    """
    List all available test scenarios.

    Returns:
        Dict with available scenarios and their metadata
    """
    try:
        scenarios = test_service.get_scenario_names()
        return scenarios

    except Exception as e:
        logger.error(f"Failed to list scenarios: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list scenarios: {str(e)}",
        ) from e


class AddTeamMemberRequest(BaseModel):
    """Request model for adding a team member in test environments."""

    user_id: str
    team_id: str
    role: str  # "owner" or "member"


class AddTeamMemberResponse(BaseModel):
    """Response model for adding a team member."""

    success: bool
    message: str
    membership_id: str
    user_id: str
    team_id: str
    role: str


@router.post("/add-team-member", response_model=AddTeamMemberResponse)
async def add_team_member(
    request: AddTeamMemberRequest,
    _: None = Depends(get_test_environment_only),
    team_membership_service: TeamMembershipService = Depends(
        get_team_membership_service
    ),
) -> AddTeamMemberResponse:
    """
    Add a user to a team with a specific role (test environment only).

    This endpoint bypasses the normal invitation flow and directly creates
    team memberships for testing purposes. It's only available in test
    environments.

    Args:
        request: Team member addition request parameters
        _: Test environment validation dependency
        team_membership_service: Team membership service dependency

    Returns:
        AddTeamMemberResponse with operation results

    Raises:
        HTTPException: If operation fails or invalid role provided
    """
    try:
        # Validate role
        role_value = request.role.lower()
        if role_value not in ["owner", "member"]:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid role '{request.role}'. " "Must be 'owner' or 'member'."
                ),
            )

        # Map string role to enum
        role_enum = (
            TeamMembershipRole.OWNER
            if role_value == "owner"
            else TeamMembershipRole.MEMBER
        )

        logger.info(
            f"Adding user {request.user_id} to team {request.team_id} "
            f"with role {role_value}"
        )

        # Create team membership
        membership = TeamMembership(
            id="",
            user_id=request.user_id,
            team_id=request.team_id,
            role=role_enum,
        )

        created_membership = await team_membership_service.create_team_membership(
            membership
        )

        logger.info(f"Successfully added team member: {created_membership.id}")

        return AddTeamMemberResponse(
            success=True,
            message=(
                f"User {request.user_id} added to team "
                f"{request.team_id} as {role_value}"
            ),
            membership_id=created_membership.id,
            user_id=created_membership.user_id,
            team_id=created_membership.team_id,
            role=created_membership.role.value,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add team member: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list scenarios: {str(e)}",
        ) from e
