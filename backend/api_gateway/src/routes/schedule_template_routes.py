from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.logger import log_info
from shared.schemas.core.schedule_template import (
    ScheduleTemplate,
    ScheduleTemplateWeekData,
    TemplateType,
)
from shared.schemas.dto.schedule_template import (
    ApplyScheduleTemplateToDateRangeDTO,
    ScheduleTemplateApplicationResult,
    ScheduleTemplateCreateDTO,
    ScheduleTemplateDTO,
    ScheduleTemplateUpdateDTO,
)

from src.dependencies import (
    get_user_context,
)
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.dependencies.schedule_template_service import (
    get_schedule_template_service,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.schedule_template_service import (
    ScheduleTemplateService,
)

router = APIRouter()


@router.post("/schedule-templates/teams/{team_id}", status_code=201)
async def create_template(
    team_id: str,
    template_dto: ScheduleTemplateCreateDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ScheduleTemplateService = Depends(get_schedule_template_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ScheduleTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "create-schedule-template", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create templates")

        empty_week = ScheduleTemplateWeekData(week_number=0, entries=[])

        template = ScheduleTemplate(
            name=template_dto.name,
            description=template_dto.description,
            team_id=team_id,
            template_type=TemplateType.STANDARD,
            weeks_data=[empty_week],
            scope_shift_ids=template_dto.scopeShiftIds or [],
            created_by=user_context.effective_user_id,
        )

        created_template = await service.create_template(template)

        log_info(f"Created schedule template {created_template.id} for team {team_id}")
        return created_template.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        log_info(f"Validation error creating schedule template: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "create",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error creating schedule template: {str(e)}")
        handle_routes_errors(e)


@router.get("/schedule-templates/teams/{team_id}")
async def get_templates_by_team(
    team_id: str,
    template_type: Optional[str] = Query(
        None, description="Filter by template type (standard|even_odd)"
    ),
    user_context: UserContext = Depends(get_user_context),
    service: ScheduleTemplateService = Depends(get_schedule_template_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[ScheduleTemplateDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-schedule-templates", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read templates")

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
        return [t.to_dto() for t in templates]

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Failed to get schedule templates for team {team_id}: {str(e)}")
        handle_routes_errors(e)


@router.get("/schedule-templates/{template_id}/teams/{team_id}")
async def get_template_by_id(
    template_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: ScheduleTemplateService = Depends(get_schedule_template_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ScheduleTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "read-schedule-templates", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read templates")

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
            detail={"error": "validation_error", "message": str(e)},
        ) from e
    except Exception as e:
        log_info(f"Failed to get schedule template {template_id}: {str(e)}")
        handle_routes_errors(e)


@router.put("/schedule-templates/{template_id}/teams/{team_id}")
async def update_template(
    template_id: str,
    team_id: str,
    template_dto: ScheduleTemplateUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ScheduleTemplateService = Depends(get_schedule_template_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ScheduleTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-schedule-template", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update templates")

        existing_template = await service.validate_template_for_team(
            template_id, team_id
        )

        existing_template.update_from_dto(template_dto)

        updated_template = await service.update_template(existing_template)

        log_info(f"Updated schedule template {template_id} for team {team_id}")
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
        log_info(f"Validation error updating schedule template {template_id}: {str(e)}")
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
        log_info(f"Internal error updating schedule template {template_id}: {str(e)}")
        handle_routes_errors(e)


@router.delete("/schedule-templates/{template_id}/teams/{team_id}", status_code=204)
async def delete_template(
    template_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: ScheduleTemplateService = Depends(get_schedule_template_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> None:
    try:
        if not await authz.check(
            user_context.user_id, "delete-schedule-template", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete templates")

        await service.validate_template_for_team(template_id, team_id)

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

        log_info(f"Deleted schedule template {template_id} for team {team_id}")

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
            detail={"error": "validation_error", "message": str(e)},
        ) from e
    except Exception as e:
        log_info(f"Failed to delete schedule template {template_id}: {str(e)}")
        handle_routes_errors(e)


@router.post("/schedule-templates/{template_id}/apply-to-range/teams/{team_id}")
async def apply_template_to_date_range(
    template_id: str,
    team_id: str,
    apply_dto: ApplyScheduleTemplateToDateRangeDTO,
    user_context: UserContext = Depends(get_user_context),
    service: ScheduleTemplateService = Depends(get_schedule_template_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> ScheduleTemplateApplicationResult:
    try:
        if not await authz.check(
            user_context.user_id, "apply-schedule-template", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to apply templates")

        start_timestamp = apply_dto.startDate
        end_timestamp = apply_dto.endDate

        if start_timestamp > 1e10:
            start_timestamp = start_timestamp / 1000
        if end_timestamp > 1e10:
            end_timestamp = end_timestamp / 1000

        start_date = datetime.fromtimestamp(start_timestamp, tz=timezone.utc).date()
        end_date = datetime.fromtimestamp(end_timestamp, tz=timezone.utc).date()

        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before or equal to end date",
            )

        result = await service.apply_template_to_date_range(
            template_id=template_id,
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            start_week_number=apply_dto.startWeekNumber,
            overwrite_demands=apply_dto.overwriteDemands,
            overwrite_assignments=apply_dto.overwriteAssignments,
        )

        log_info(
            f"Successfully applied schedule template {template_id} to date range "
            f"{start_date} to {end_date} for team {team_id}"
        )

        return ScheduleTemplateApplicationResult(
            success=True,
            demandsCreated=result["demandsCreated"],
            demandsDeleted=result["demandsDeleted"],
            assignmentsCreated=result["assignmentsCreated"],
            assignmentsDeleted=result["assignmentsDeleted"],
            message=result["message"],
        )

    except NotAuthorizedError as e:
        log_info(f"Authorization failed for schedule template application: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        log_info(f"Validation error in schedule template application: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        log_info(f"Failed to apply schedule template {template_id}: {str(e)}")
        handle_routes_errors(e)
