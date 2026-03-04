from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.logger import log_info
from shared.schemas.core.shift_demand_template import (
    ShiftDemandTemplate,
    TemplateType,
    TemplateWeekData,
)
from shared.schemas.dto.shift_demand_template import (
    ApplyDemandsToTemplateWeekDTO,
    ApplyTemplateToDateRangeDTO,
    ShiftDemandTemplateCreateDTO,
    ShiftDemandTemplateDTO,
    ShiftDemandTemplateUpdateDTO,
    TemplateApplicationResult,
)

from src.dependencies import (
    get_shift_demand_template_service,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.shift_demand_template_service import (
    ShiftDemandTemplateService,
)

router = APIRouter()


# pylint: disable=R0801
@router.post("/shift-demand-templates/teams/{team_id}", status_code=201)
async def create_template(
    team_id: str,
    template_dto: ShiftDemandTemplateCreateDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> ShiftDemandTemplateDTO:
    """Create a new shift demand template."""
    try:
        if not await authz_check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create templates")

        # Create a basic template with minimal data
        # Since CreateDTO only has name and description, we create a standard template
        # with one empty week as the default

        # Create empty week data as default
        empty_week = TemplateWeekData(week_number=0, demands=[])

        template = ShiftDemandTemplate(
            name=template_dto.name,
            description=template_dto.description,
            team_id=team_id,
            template_type=TemplateType.STANDARD,
            weeks_data=[empty_week],
            created_by=user_context.effective_user_id,
        )

        # Create through service
        created_template = await service.create_template(template)

        log_info(f"Created template {created_template.id} for team {team_id}")
        return created_template.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        log_info(f"Validation error creating template: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "create",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error creating template: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "operation": "create",
                "message": "An internal error occurred. Please try again later.",
            },
        ) from e


@router.get("/shift-demand-templates/teams/{team_id}")
async def get_templates_by_team(
    team_id: str,
    template_type: Optional[str] = Query(
        None, description="Filter by template type (standard|even_odd)"
    ),
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> List[ShiftDemandTemplateDTO]:
    """Get all templates for a team, optionally filtered by type."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read templates")

        # Validate template_type if provided
        if template_type and template_type not in ["standard", "even_odd"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_template_type",
                    "message": "Template type must be 'standard' or 'even_odd'",
                    "provided_type": template_type,
                },
            )

        templates = await service.get_templates_by_team(team_id, template_type)
        return [template.to_dto() for template in templates]

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Failed to get templates for team {team_id}: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/shift-demand-templates/{template_id}/teams/{team_id}")
async def get_template_by_id(
    template_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> ShiftDemandTemplateDTO:
    """Get a specific template by ID."""
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read templates")

        # Validate template belongs to team
        template = await service.validate_template_for_team(template_id, team_id)
        return template.to_dto()

    except NotAuthorizedError:
        raise
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            ) from e
        if "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Failed to get template {template_id}: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.put("/shift-demand-templates/{template_id}/teams/{team_id}")
async def update_template(
    template_id: str,
    team_id: str,
    template_dto: ShiftDemandTemplateUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> ShiftDemandTemplateDTO:
    """Update an existing template."""
    try:
        if not await authz_check(
            user_context.user_id, "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update templates")

        # Get existing template for validation and update
        existing_template = await service.validate_template_for_team(
            template_id, team_id
        )

        # Apply partial update
        existing_template.update_from_dto(template_dto)

        # Save through service
        updated_template = await service.update_template(existing_template)

        log_info(f"Updated template {template_id} for team {team_id}")
        return updated_template.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            ) from e
        if "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        log_info(f"Validation error updating template {template_id}: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "update",
                "message": str(e),
                "template_id": template_id,
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error updating template {template_id}: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "operation": "update",
                "message": "An internal error occurred. Please try again later.",
                "template_id": template_id,
            },
        ) from e


@router.delete("/shift-demand-templates/{template_id}/teams/{team_id}", status_code=204)
async def delete_template(
    template_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> None:
    """Delete a template."""
    try:
        if not await authz_check(
            user_context.user_id, "delete-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete templates")

        # Validate template belongs to team
        await service.validate_template_for_team(template_id, team_id)

        # Delete template
        success = await service.delete_template(template_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )

        log_info(f"Deleted template {template_id} for team {team_id}")

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            ) from e
        if "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Failed to delete template {template_id}: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demand-templates/{template_id}/apply-demands/teams/{team_id}")
async def apply_demands_to_template_week(
    template_id: str,
    team_id: str,
    apply_dto: ApplyDemandsToTemplateWeekDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> ShiftDemandTemplateDTO:
    """Apply existing shift demands from a source week to a template week."""
    try:
        if not await authz_check(
            user_context.user_id, "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update templates")

        # Convert timestamp to datetime
        # Handle both seconds and milliseconds (defensive programming)
        timestamp = apply_dto.sourceWeekStartDate

        # If timestamp is too large, likely milliseconds, convert to seconds
        if timestamp > 1e10:  # Roughly year 2286, so larger is likely ms
            timestamp = timestamp / 1000
            log_info(
                f"Converted millisecond timestamp "
                f"{apply_dto.sourceWeekStartDate} to seconds {timestamp}"
            )

        source_week_start = datetime.fromtimestamp(timestamp, tz=timezone.utc)

        # Apply demands using service
        updated_template = await service.apply_demands_to_template_week(
            template_id=template_id,
            team_id=team_id,
            source_week_start=source_week_start,
            target_week_number=apply_dto.targetWeekNumber,
        )

        log_info(
            f"Applied demands to template {template_id} week "
            f"{apply_dto.targetWeekNumber} for team {team_id}"
        )
        return updated_template.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "not_found",
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            ) from e
        if "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        if "invalid week" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_week",
                    "message": str(e),
                    "target_week_number": apply_dto.targetWeekNumber,
                },
            ) from e
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Failed to apply demands to template {template_id}: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/shift-demand-templates/{template_id}/apply-to-range/teams/{team_id}")
async def apply_template_to_date_range(
    template_id: str,
    team_id: str,
    apply_dto: ApplyTemplateToDateRangeDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ShiftDemandTemplateService = Depends(get_shift_demand_template_service),
) -> TemplateApplicationResult:
    """Apply a template to a specific date range."""
    try:
        # Check permissions for creating shift demands
        if not await authz_check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to apply templates")

        # Convert timestamps to date objects
        # Handle both seconds and milliseconds (defensive programming)
        start_timestamp = apply_dto.startDate
        end_timestamp = apply_dto.endDate

        # If timestamp is too large, likely milliseconds, convert to seconds
        if start_timestamp > 1e10:
            start_timestamp = start_timestamp / 1000
        if end_timestamp > 1e10:
            end_timestamp = end_timestamp / 1000

        start_date = datetime.fromtimestamp(start_timestamp, tz=timezone.utc).date()
        end_date = datetime.fromtimestamp(end_timestamp, tz=timezone.utc).date()

        # Validate date range
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before or equal to end date",
            )

        # Apply template to date range
        result = await service.apply_template_to_date_range(
            template_id=template_id,
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            overwrite_existing=apply_dto.overwriteExisting,
        )

        log_info(
            f"Successfully applied template {template_id} to date range "
            f"{start_date} to {end_date} for team {team_id}"
        )

        return TemplateApplicationResult(
            success=True,
            demandsCreated=result["demands_created"],
            demandsUpdated=result["demands_updated"],
            demandsDeleted=result["demands_deleted"],
            message=(
                f"Template applied successfully. "
                f"Created {result['demands_created']}, "
                f"updated {result['demands_updated']}, "
                f"deleted {result['demands_deleted']} demands."
            ),
        )

    except NotAuthorizedError as e:
        log_info(f"Authorization failed for template application: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        log_info(f"Validation error in template application: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to apply template {template_id} to date range: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(status_code=500, detail="Internal server error") from e
