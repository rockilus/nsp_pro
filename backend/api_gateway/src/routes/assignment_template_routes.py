from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.logger import log_info
from shared.schemas.core.assignment_template import (
    AssignmentTemplate,
    AssignmentTemplateWeekData,
)
from shared.schemas.core.shift_demand_template import TemplateType
from shared.schemas.dto.assignment_template import (
    ApplyAssignmentsToTemplateWeekDTO,
    ApplyAssignmentTemplateToDateRangeDTO,
    AssignmentTemplateApplicationResult,
    AssignmentTemplateCreateDTO,
    AssignmentTemplateDTO,
    AssignmentTemplateUpdateDTO,
)

from src.dependencies import (
    get_assignment_template_service,
    get_user_context,
)
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors.routes_errors.routes_errors import NotAuthorizedError
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.assignment_template_service import (
    AssignmentTemplateService,
)

router = APIRouter(prefix="/v1", tags=["assignment-templates"])


@router.post(
    "/assignment-templates/teams/{team_id}",
    status_code=201,
    response_model=AssignmentTemplateDTO,
)
async def create_template(
    team_id: str,
    template_dto: AssignmentTemplateCreateDTO,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
) -> AssignmentTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create templates")

        template = AssignmentTemplate(
            name=template_dto.name,
            description=template_dto.description,
            team_id=team_id,
            template_type=TemplateType.STANDARD,
            weeks_data=[AssignmentTemplateWeekData(week_number=0, entries=[])],
            created_by=user_context.user_id,
        )

        created_template = await service.create_template(template)

        log_info(
            f"Created assignment template {created_template.id} for team {team_id}"
        )
        return created_template.to_dto()

    except ValueError as e:
        log_info(f"Validation error creating assignment template: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Internal error creating assignment template: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to create assignment template"
        )


@router.get(
    "/assignment-templates/teams/{team_id}",
    response_model=list[AssignmentTemplateDTO],
)
async def get_templates_by_team(
    team_id: str,
    template_type: Optional[str] = Query(
        None, description="Filter by template type (standard|even_odd)"
    ),
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
) -> list[AssignmentTemplateDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read templates")

        if template_type and template_type not in ["standard", "even_odd"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "invalid_template_type",
                    "message": f"Invalid template type: {template_type}",
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
        log_info(f"Failed to get assignment templates for team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get templates")


@router.get(
    "/assignment-templates/{template_id}/teams/{team_id}",
    response_model=AssignmentTemplateDTO,
)
async def get_template_by_id(
    template_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
) -> AssignmentTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read templates")

        template = await service.validate_template_for_team(template_id, team_id)
        return template.to_dto()

    except NotAuthorizedError:
        raise
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )
        raise HTTPException(
            status_code=404,
            detail={
                "message": str(e),
                "template_id": template_id,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Failed to get assignment template {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get template")


@router.put(
    "/assignment-templates/{template_id}/teams/{team_id}",
    response_model=AssignmentTemplateDTO,
)
async def update_template(
    template_id: str,
    team_id: str,
    template_dto: AssignmentTemplateUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
) -> AssignmentTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update templates")

        existing_template = await service.validate_template_for_team(
            template_id, team_id
        )

        existing_template.update_from_dto(template_dto)

        updated_template = await service.update_template(existing_template)

        log_info(f"Updated assignment template {template_id} for team {team_id}")
        return updated_template.to_dto()

    except NotAuthorizedError:
        raise
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )
        raise HTTPException(
            status_code=422,
            detail={
                "message": str(e),
                "template_id": template_id,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Failed to update assignment template {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update template")


@router.delete(
    "/assignment-templates/{template_id}/teams/{team_id}",
    status_code=204,
)
async def delete_template(
    template_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
):
    try:
        if not await authz.check(
            user_context.user_id, "delete-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete templates")

        await service.validate_template_for_team(template_id, team_id)

        success = await service.delete_template(template_id)

        if not success:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )

        log_info(f"Deleted assignment template {template_id} for team {team_id}")

    except NotAuthorizedError:
        raise
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )
        raise HTTPException(
            status_code=422,
            detail={
                "message": str(e),
                "template_id": template_id,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Failed to delete assignment template {template_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete template")


@router.post(
    "/assignment-templates/{template_id}/apply-assignments/teams/{team_id}",
    response_model=AssignmentTemplateDTO,
)
async def apply_assignments_to_template_week(
    template_id: str,
    team_id: str,
    request: ApplyAssignmentsToTemplateWeekDTO,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
) -> AssignmentTemplateDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update templates")

        source_week_start = datetime.fromtimestamp(
            request.sourceWeekStartDate, tz=timezone.utc
        )

        updated_template = await service.apply_assignments_to_template_week(
            template_id=template_id,
            team_id=team_id,
            source_week_start=source_week_start,
            target_week_number=request.targetWeekNumber,
        )

        log_info(
            f"Applied assignments to template {template_id} week "
            f"{request.targetWeekNumber} for team {team_id}"
        )
        return updated_template.to_dto()

    except NotAuthorizedError:
        raise
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )
        raise HTTPException(
            status_code=422,
            detail={
                "message": str(e),
                "template_id": template_id,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        log_info(f"Failed to apply assignments to template {template_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to apply assignments to template"
        )


@router.post(
    "/assignment-templates/{template_id}/apply-to-range/teams/{team_id}",
    response_model=AssignmentTemplateApplicationResult,
)
async def apply_template_to_date_range(
    template_id: str,
    team_id: str,
    request: ApplyAssignmentTemplateToDateRangeDTO,
    user_context: UserContext = Depends(get_user_context),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
    service: AssignmentTemplateService = Depends(get_assignment_template_service),
) -> AssignmentTemplateApplicationResult:
    try:
        if not await authz.check(
            user_context.user_id, "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to apply templates")

        start_date = datetime.fromtimestamp(request.startDate, tz=timezone.utc).date()
        end_date = datetime.fromtimestamp(request.endDate, tz=timezone.utc).date()

        result = await service.apply_template_to_date_range(
            template_id=template_id,
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
            overwrite_existing=request.overwriteExisting,
            shift_id_filter=request.shiftId,
        )

        log_info(
            f"Applied assignment template {template_id} to date range "
            f"{start_date} to {end_date} for team {team_id}"
        )
        return AssignmentTemplateApplicationResult(**result)

    except NotAuthorizedError:
        raise
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail={
                    "message": f"Template with ID {template_id} not found",
                    "template_id": template_id,
                },
            )
        raise HTTPException(
            status_code=422,
            detail={
                "message": str(e),
                "template_id": template_id,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        log_info(
            f"Failed to apply assignment template {template_id} to date range: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail="Failed to apply template to date range"
        )
