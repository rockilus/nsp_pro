"""Strict argument schemas for the copilot worker write tools.

Rich ``Field`` descriptions double as instructions that guide the LLM's
argument extraction. Update schemas keep every mutable field ``Optional`` so
the model can emit atomic partial patches (PATCH pattern) without hallucinating
values for fields the user never mentioned.
"""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class CreateWorkerArgs(BaseModel):
    """Arguments to add a brand-new team member to a team roster."""

    team_id: str = Field(
        ...,
        description="The unique identifier of the destination team. Usually "
        "provided by the active screen context; do not invent it.",
    )
    name: str = Field(
        ..., description="The full legal name of the nurse or practitioner."
    )
    weekly_hours: int = Field(
        ...,
        description="Contracted baseline weekly working hours (typically 35 or 40).",
    )
    weekly_hours_desired: int = Field(
        ...,
        description="The individual's preferred target weekly workload in hours.",
    )
    duties_per_month: int = Field(
        ...,
        description="Target number of weekend/night duty assignments per month.",
    )
    annual_leave: int = Field(
        default=25, description="Accrued annual vacation-day allowance."
    )
    specialty_ids: List[str] = Field(
        default_factory=list,
        description="IDs of specialties this worker holds. Empty if unknown.",
    )
    employment_start_date: date = Field(
        ...,
        description="ISO date (YYYY-MM-DD) when the worker's employment starts.",
    )


class UpdateWorkerArgs(BaseModel):
    """Partial patch of an existing worker's profile.

    Only the fields the user explicitly wants to change should be populated;
    every other field must be left null so existing values are preserved.
    """

    worker_id: str = Field(
        ..., description="The immutable identifier of the target worker record."
    )
    name: Optional[str] = Field(None, description="Updated full name.")
    weekly_hours: Optional[int] = Field(
        None, description="Adjusted contractual weekly hours."
    )
    weekly_hours_desired: Optional[int] = Field(
        None, description="Adjusted preferred weekly workload in hours."
    )
    duties_per_month: Optional[int] = Field(
        None, description="Adjusted target monthly duty assignment count."
    )
    annual_leave: Optional[int] = Field(
        None, description="Updated annual vacation-day allowance."
    )
    specialty_ids: Optional[List[str]] = Field(
        None,
        description="Complete replacement list of specialty IDs. Only set when "
        "the user wants to change the worker's specialties.",
    )
    employment_end_date: Optional[date] = Field(
        None,
        description="ISO date (YYYY-MM-DD) marking employment end when "
        "offboarding a worker.",
    )


class DeleteWorkerArgs(BaseModel):
    """Arguments to soft-delete (flag as deleted) a worker record."""

    worker_id: str = Field(
        ...,
        description="The unique identifier of the worker record to soft-delete.",
    )


class SetWorkerDimensionValueArgs(BaseModel):
    """Arguments to set/update a worker's value for one custom dimension.

    For dropdown (DIM_ENTRIES) dimensions, populate ``dim_entry_ids`` with the
    chosen entry IDs (resolve names to IDs via the ``get_dimensions`` tool). For
    text/number/boolean dimensions, populate ``value`` instead.
    """

    worker_id: str = Field(
        ..., description="The identifier of the worker whose value is being set."
    )
    dimension_id: str = Field(
        ..., description="The identifier of the dimension being set for the worker."
    )
    value: Optional[str | int | float | bool] = Field(
        None,
        description="The raw value for text, numeric, or boolean dimensions. "
        "Leave null for dropdown (DIM_ENTRIES) dimensions.",
    )
    dim_entry_ids: Optional[List[str]] = Field(
        None,
        description="Selected dropdown entry IDs for DIM_ENTRIES dimensions. "
        "Leave null for text/numeric/boolean dimensions.",
    )
