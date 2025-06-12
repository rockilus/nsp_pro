from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.logger import log_info
from shared.schemas.core.shift_demand_template import (
    ShiftDemandTemplate,
    TemplateType,
)
from shared.schemas.dto.shift_demand_template import (
    ApplyTemplateDTO,
    ShiftDemandTemplateCreateDTO,
    ShiftDemandTemplateDTO,
    ShiftDemandTemplateUpdateDTO,
    TemplateFromDemandsDTO,
)

from src.dependencies import get_shift_demand_template_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.shift_demand_template_service import (
    ShiftDemandTemplateService,
)

router = APIRouter()


@router.post("/shift-demand-templates/teams/{team_id}", status_code=201)
async def create_template(
    team_id: str,
    template_dto: ShiftDemandTemplateCreateDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
) -> ShiftDemandTemplateDTO:
    """Create a new shift demand template."""
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create templates"
            )

        # Validate team ID consistency
        if template_dto.teamId != team_id:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "team_id_mismatch",
                    "message": "Team ID in path must match team ID in request body",
                    "path_team_id": team_id,
                    "body_team_id": template_dto.teamId,
                },
            )

        # Convert create DTO to core model
        template = ShiftDemandTemplate.from_create_dto(
            template_dto, session.get_user_id()
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
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
) -> List[ShiftDemandTemplateDTO]:
    """Get all templates for a team, optionally filtered by type."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read templates"
            )

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
        raise HTTPException(
            status_code=500, detail="Internal server error"
        ) from e


@router.get("/shift-demand-templates/{template_id}/teams/{team_id}")
async def get_template_by_id(
    template_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
) -> ShiftDemandTemplateDTO:
    """Get a specific template by ID."""
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-demands", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read templates"
            )

        # Validate template belongs to team
        template = await service.validate_template_for_team(
            template_id, team_id
        )
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
        elif "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        else:
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
        raise HTTPException(
            status_code=500, detail="Internal server error"
        ) from e


@router.put("/shift-demand-templates/{template_id}/teams/{team_id}")
async def update_template(
    template_id: str,
    team_id: str,
    template_dto: ShiftDemandTemplateUpdateDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
) -> ShiftDemandTemplateDTO:
    """Update an existing template."""
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update templates"
            )

        # Validate team_id consistency if provided in update
        if template_dto.teamId is not None and template_dto.teamId != team_id:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "team_change_not_allowed",
                    "message": "Cannot change team ID through update operation",
                    "current_team_id": team_id,
                    "requested_team_id": template_dto.teamId,
                },
            )

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
        elif "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        else:
            log_info(
                f"Validation error updating template {template_id}: {str(e)}"
            )
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


@router.delete(
    "/shift-demand-templates/{template_id}/teams/{team_id}", status_code=204
)
async def delete_template(
    template_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
) -> None:
    """Delete a template."""
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete templates"
            )

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
        elif "does not belong" in str(e):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "forbidden",
                    "message": "Template does not belong to specified team",
                    "template_id": template_id,
                    "team_id": team_id,
                },
            ) from e
        else:
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
        raise HTTPException(
            status_code=500, detail="Internal server error"
        ) from e


@router.post("/shift-demand-templates/teams/{team_id}/from-demands")
async def create_template_from_demands(
    team_id: str,
    demands_dto: TemplateFromDemandsDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
) -> ShiftDemandTemplateDTO:
    """Create a template from existing shift demands."""
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create templates"
            )

        # Validate team ID consistency
        if demands_dto.teamId != team_id:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "team_id_mismatch",
                    "message": "Team ID in path must match team ID in request body",
                    "path_team_id": team_id,
                    "body_team_id": demands_dto.teamId,
                },
            )

        # Convert DTO to parameters for service call
        template_type = TemplateType(demands_dto.templateType)

        # Create template from demands
        created_template = await service.create_template_from_demands(
            name=demands_dto.name,
            team_id=team_id,
            template_type=template_type,
            shift_demands=demands_dto.shiftDemands,
            created_by=session.get_user_id(),
            description=demands_dto.description,
        )

        log_info(
            f"Created template from demands {created_template.id} for team {team_id}"
        )
        return created_template.to_dto()

    except NotAuthorizedError:
        raise
    except HTTPException:
        raise
    except ValueError as e:
        log_info(f"Validation error creating template from demands: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "validation_error",
                "operation": "create_from_demands",
                "message": str(e),
            },
        ) from e
    except Exception as e:
        log_info(f"Internal error creating template from demands: {str(e)}")
        handle_routes_errors(e)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "operation": "create_from_demands",
                "message": "An internal error occurred. Please try again later.",
            },
        ) from e
