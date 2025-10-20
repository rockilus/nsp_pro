"""
Test utilities endpoints - ONLY available in test environments.

These endpoints provide testing utilities such as database reset functionality.
They include multiple safety mechanisms to prevent accidental use in
production.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from loguru import logger
from pydantic import BaseModel
from shared.database.reset_service import (
    DatabaseResetError,
    DatabaseResetService,
)

from src.config import config
from src.integrations.authorization import authz_delete_all_instances


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
    environment = str(config.environment).lower()

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
            await authz_delete_all_instances()  # Delete all instances in authz
        else:
            result = await reset_service.reset_specific_collections(
                request.collections
            )
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
        "test_utilities_available": config.environment
        in ["test", "testing", "local", "development"],
    }


class ScenarioLoadRequest(BaseModel):
    """Request model for loading test scenarios."""

    scenario_name: str
    team_id: str


class ScenarioLoadResponse(BaseModel):
    """Response model for scenario loading."""

    success: bool
    scenario_name: str
    workers: List[dict]
    shifts: List[dict]
    shift_demands: List[dict]
    constraints: List[dict]
    schedule: dict


@router.post("/scenarios/load", response_model=ScenarioLoadResponse)
async def load_test_scenario(
    request: ScenarioLoadRequest,
    _: None = Depends(get_test_environment_only),
    db_interface=Depends(get_database_interface),
) -> ScenarioLoadResponse:
    """
    Load a predefined test scenario for E2E testing.

    This endpoint creates all necessary data for a test scenario:
    - Workers with specified properties
    - Shifts with configured times and staffing
    - Shift demands according to the scenario pattern
    - Constraints (if any)

    Args:
        request: Scenario load request with scenario name and team ID
        _: Test environment validation dependency
        db_interface: Database interface dependency

    Returns:
        ScenarioLoadResponse with all created entities

    Raises:
        HTTPException: If scenario doesn't exist or creation fails
    """
    try:
        from datetime import datetime

        from shared.schemas.core import Shift, ShiftDemandNew, Worker
        from src.tests.fixtures.solver_test_scenarios import (
            SolverTestScenarios,
        )

        logger.info(
            f"Loading test scenario '{request.scenario_name}' "
            f"for team '{request.team_id}'"
        )

        # Get scenario data
        try:
            scenario_data = SolverTestScenarios.get_scenario(
                request.scenario_name
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e

        created_workers = []
        created_shifts = []
        created_shift_demands = []
        created_constraints = []

        # Create workers
        from src.utils.string_utils import generate_acronym

        worker_collection = db_interface.get_collection("workers")
        for worker_data in scenario_data["workers"]:
            from datetime import date

            worker = Worker(
                id="",
                team_id=request.team_id,
                name=worker_data["name"],
                acronym=worker_data.get("acronym", ""),
                acronym_custom=False,
                employment_start_date=date.fromisoformat(
                    worker_data["employment_start_date"]
                ),
                employment_end_date=(
                    date.fromisoformat(worker_data["employment_end_date"])
                    if worker_data.get("employment_end_date")
                    else None
                ),
                weekly_hours=worker_data["weekly_hours"],
                weekly_hours_desired=worker_data["weekly_hours_desired"],
                duties_per_month=worker_data["duties_per_month"],
                annual_leave=worker_data["annual_leave"],
                specialty_ids=worker_data.get("specialty_ids", []),
                deleted=False,
            )

            # Generate acronym if not provided
            if not worker.acronym:
                existing_acronyms = [w["acronym"] for w in created_workers]
                worker.acronym = generate_acronym(
                    worker.name, existing_acronyms
                )

            # Insert worker
            result = await worker_collection.insert_one(worker.to_dict())
            worker.id = str(result.inserted_id)
            created_workers.append(worker.to_dict())

        logger.info(f"Created {len(created_workers)} workers")

        # Create shifts
        from shared.schemas.core import (
            ShiftLeaveType,
            ShiftRestType,
            ShiftType,
            Staffing,
        )

        shift_collection = db_interface.get_collection("shifts")
        for shift_data in scenario_data["shifts"]:
            # Parse times
            start_time_str = shift_data["start_time"]
            end_time_str = shift_data["end_time"]

            start_time = datetime.strptime(
                f"2025-01-01 {start_time_str}", "%Y-%m-%d %H:%M:%S"
            )
            end_time = datetime.strptime(
                f"2025-01-01 {end_time_str}", "%Y-%m-%d %H:%M:%S"
            )

            staffing_list = [
                Staffing(
                    specialty_id=s.get("specialty_id"),
                    staffing=s["staffing"],
                )
                for s in shift_data["staffing"]
            ]

            shift = Shift(
                id="",
                team_id=request.team_id,
                name=shift_data["name"],
                acronym=shift_data["acronym"],
                acronym_custom=False,
                start_time=start_time,
                end_time=end_time,
                staffing=staffing_list,
                color=shift_data["color"],
                shift_type=ShiftType[shift_data["shift_type"]],
                rest_type=ShiftRestType[shift_data["rest_type"]],
                leave_type=ShiftLeaveType[shift_data["leave_type"]],
                recuperation_time=shift_data["recuperation_time"],
                recuperation_duty_id=None,
                deleted=False,
            )

            # Insert shift
            result = await shift_collection.insert_one(shift.to_dict())
            shift.id = str(result.inserted_id)
            created_shifts.append(shift.to_dict())

        logger.info(f"Created {len(created_shifts)} shifts")

        # Create shift demands
        from datetime import date, timedelta

        from shared.schemas.core import ShiftDemandSource

        shift_demand_collection = db_interface.get_collection(
            "shift_demands_new"
        )
        demand_config = scenario_data["shift_demands"]
        start_date = date.fromisoformat(demand_config["start_date"])
        end_date = date.fromisoformat(demand_config["end_date"])

        # Generate shift demands based on pattern
        pattern = demand_config["pattern"]
        current_date = start_date

        while current_date <= end_date:
            should_create_demand = True

            # Apply pattern logic
            if pattern == "weekend_only":
                # Only create demands for weekends (Saturday=5, Sunday=6)
                should_create_demand = current_date.weekday() in [5, 6]
            elif pattern == "weekday_only":
                # Only create demands for weekdays
                should_create_demand = current_date.weekday() < 5
            # pattern == "daily" creates demands for all days

            if should_create_demand:
                for demand_info in demand_config["demands"]:
                    shift_index = demand_info["shift_index"]
                    count = demand_info["count"]

                    if shift_index < len(created_shifts):
                        shift_id = created_shifts[shift_index]["id"]

                        shift_demand = ShiftDemandNew(
                            date=current_date,
                            shift_id=shift_id,
                            team_id=request.team_id,
                            count=count,
                            source=ShiftDemandSource.MANUAL,
                            id="",
                        )

                        result = await shift_demand_collection.insert_one(
                            shift_demand.to_dict()
                        )
                        shift_demand.id = str(result.inserted_id)
                        created_shift_demands.append(shift_demand.to_dict())

            current_date += timedelta(days=1)

        logger.info(f"Created {len(created_shift_demands)} shift demands")

        # Constraints are not yet implemented in this version
        # Future enhancement would create constraint builds here

        logger.info(
            f"Successfully loaded scenario '{request.scenario_name}' "
            f"for team '{request.team_id}'"
        )

        return ScenarioLoadResponse(
            success=True,
            scenario_name=request.scenario_name,
            workers=created_workers,
            shifts=created_shifts,
            shift_demands=created_shift_demands,
            constraints=created_constraints,
            schedule=scenario_data["schedule"],
        )

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
    _: None = Depends(get_test_environment_only),
) -> dict:
    """
    List all available test scenarios.

    Returns:
        Dict with available scenarios and their metadata
    """
    try:
        from src.tests.fixtures.solver_test_scenarios import (
            SolverTestScenarios,
        )

        scenarios = SolverTestScenarios.get_all_scenarios()
        scenario_metadata = [
            SolverTestScenarios.get_scenario_metadata(name)
            for name in scenarios
        ]

        return {
            "scenarios": scenario_metadata,
            "total_count": len(scenarios),
        }

    except Exception as e:
        logger.error(f"Failed to list scenarios: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list scenarios: {str(e)}",
        ) from e
