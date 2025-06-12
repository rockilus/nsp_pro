"""
Routes for applying shift demand templates.

This module provides endpoints for applying templates to periods,
previewing applications, and validating template compatibility.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.services.shift_demand_template_application_service import (
    ShiftDemandTemplateApplicationService,
)


class ApplyTemplateRequest(BaseModel):
    """Request model for applying a template to a period."""

    template_id: str = Field(..., description="ID of the template to apply")
    target_start: date = Field(..., description="Start date of target period")
    target_end: date = Field(..., description="End date of target period")
    replace_existing: bool = Field(
        True, description="Whether to replace existing demands"
    )
    shift_filter: Optional[List[str]] = Field(
        None, description="Optional list of shift IDs to filter"
    )


class ApplyTemplateResponse(BaseModel):
    """Response model for template application."""

    success: bool = Field(..., description="Whether the operation succeeded")
    message: str = Field(..., description="Success or error message")
    created_count: int = Field(..., description="Number of demands created")
    replaced_count: int = Field(..., description="Number of demands replaced")
    template_id: str = Field(..., description="ID of the applied template")
    target_period: str = Field(..., description="Target period description")


class TemplateCompatibilityResponse(BaseModel):
    """Response model for template compatibility check."""

    compatible: bool = Field(..., description="Whether template is compatible")
    valid_shifts: List[str] = Field(..., description="List of valid shift IDs")
    invalid_shifts: List[str] = Field(..., description="List of invalid shift IDs")
    warnings: List[str] = Field(..., description="List of warning messages")


class TemplatePreviewResponse(BaseModel):
    """Response model for template application preview."""

    total_demands: int = Field(..., description="Total number of demands")
    total_demand_value: int = Field(..., description="Sum of all demand values")
    demands_by_shift: dict[str, int] = Field(
        ..., description="Demands grouped by shift ID"
    )
    demands_by_date: dict[str, int] = Field(..., description="Demands grouped by date")
    affected_dates: List[str] = Field(..., description="List of affected dates")
    template_type: str = Field(..., description="Type of template")
    template_weeks: int = Field(..., description="Number of weeks in template")


def create_template_application_router(
    application_service: ShiftDemandTemplateApplicationService,
) -> APIRouter:
    """Create the template application router with dependency injection."""
    router = APIRouter(prefix="/templates", tags=["Template Application"])

    @router.post(
        "/{team_id}/apply",
        response_model=ApplyTemplateResponse,
        summary="Apply template to period",
        description="Apply a shift demand template to a specific time period",
    )
    async def apply_template_to_period(
        team_id: str,
        request: ApplyTemplateRequest,
        session: SessionContainerType = Depends(authn_verify_session()),
    ):
        """Apply a template to a period."""
        try:
            # TODO: Add team membership validation here
            # if not await check_team_access(session.get_user_id(), team_id):
            #     raise HTTPException(status_code=403, detail="Access denied")

            created_demands, replaced_count = (
                await application_service.apply_template_to_period(
                    template_id=request.template_id,
                    team_id=team_id,
                    target_start=request.target_start,
                    target_end=request.target_end,
                    replace_existing=request.replace_existing,
                    shift_filter=request.shift_filter,
                )
            )

            return ApplyTemplateResponse(
                success=True,
                message=(
                    f"Successfully applied template to period "
                    f"{request.target_start} to {request.target_end}"
                ),
                created_count=len(created_demands),
                replaced_count=replaced_count,
                template_id=request.template_id,
                target_period=f"{request.target_start} to {request.target_end}",
            )

        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to apply template: {str(e)}"
            )

    @router.get(
        "/{team_id}/{template_id}/compatibility",
        response_model=TemplateCompatibilityResponse,
        summary="Check template compatibility",
        description="Check if a template can be applied to a specific period",
    )
    async def check_template_compatibility(
        team_id: str,
        template_id: str,
        target_start: date = Query(..., description="Start date of target period"),
        target_end: date = Query(..., description="End date of target period"),
        session: SessionContainerType = Depends(authn_verify_session()),
    ):
        """Check template compatibility with a target period."""
        try:
            # TODO: Add team membership validation here
            # if not await check_team_access(session.get_user_id(), team_id):
            #     raise HTTPException(status_code=403, detail="Access denied")

            validation_result = (
                await application_service.validate_template_compatibility(
                    template_id=template_id,
                    team_id=team_id,
                    target_start=target_start,
                    target_end=target_end,
                )
            )

            return TemplateCompatibilityResponse(
                compatible=len(validation_result["warnings"]) == 0,
                valid_shifts=validation_result["valid_shifts"],
                invalid_shifts=validation_result["invalid_shifts"],
                warnings=validation_result["warnings"],
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to check template compatibility: {str(e)}",
            )

    @router.get(
        "/{team_id}/{template_id}/preview",
        response_model=TemplatePreviewResponse,
        summary="Preview template application",
        description=(
            "Preview the result of applying a template without actually " "applying it"
        ),
    )
    async def preview_template_application(
        team_id: str,
        template_id: str,
        target_start: date = Query(..., description="Start date of target period"),
        target_end: date = Query(..., description="End date of target period"),
        shift_filter: Optional[List[str]] = Query(
            None, description="Optional list of shift IDs to filter"
        ),
        session: SessionContainerType = Depends(authn_verify_session()),
    ):
        """Preview template application without actually applying it."""
        try:
            # TODO: Add team membership validation here
            # if not await check_team_access(session.get_user_id(), team_id):
            #     raise HTTPException(status_code=403, detail="Access denied")

            preview_result = await application_service.preview_template_application(
                template_id=template_id,
                team_id=team_id,
                target_start=target_start,
                target_end=target_end,
                shift_filter=shift_filter,
            )

            return TemplatePreviewResponse(**preview_result)

        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to preview template application: {str(e)}",
            )

    @router.post(
        "/{team_id}/apply-batch",
        response_model=List[ApplyTemplateResponse],
        summary="Apply template to multiple periods",
        description="Apply a template to multiple time periods in batch",
    )
    async def apply_template_batch(
        team_id: str,
        requests: List[ApplyTemplateRequest],
        session: SessionContainerType = Depends(authn_verify_session()),
    ):
        """Apply a template to multiple periods in batch."""
        try:
            # TODO: Add team membership validation here
            # if not await check_team_access(session.get_user_id(), team_id):
            #     raise HTTPException(status_code=403, detail="Access denied")

            results = []
            for request in requests:
                try:
                    created_demands, replaced_count = (
                        await application_service.apply_template_to_period(
                            template_id=request.template_id,
                            team_id=team_id,
                            target_start=request.target_start,
                            target_end=request.target_end,
                            replace_existing=request.replace_existing,
                            shift_filter=request.shift_filter,
                        )
                    )

                    results.append(
                        ApplyTemplateResponse(
                            success=True,
                            message=(
                                f"Successfully applied template to period "
                                f"{request.target_start} to {request.target_end}"
                            ),
                            created_count=len(created_demands),
                            replaced_count=replaced_count,
                            template_id=request.template_id,
                            target_period=(
                                f"{request.target_start} to " f"{request.target_end}"
                            ),
                        )
                    )

                except Exception as e:
                    results.append(
                        ApplyTemplateResponse(
                            success=False,
                            message=f"Failed to apply template: {str(e)}",
                            created_count=0,
                            replaced_count=0,
                            template_id=request.template_id,
                            target_period=(
                                f"{request.target_start} to " f"{request.target_end}"
                            ),
                        )
                    )

            return results

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process batch request: {str(e)}",
            )

    return router
