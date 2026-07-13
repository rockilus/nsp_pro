"""Structured classification schemas for the copilot intent router.

Used with LiteLLM's ``response_format`` to force deterministic classifier
output instead of fragile string-splitting on pipe-delimited tokens.
"""

from enum import Enum

from pydantic import BaseModel, Field


class CopilotIntent(str, Enum):
    GENERAL_QA = "general_qa"
    WORKER_MANAGEMENT = "worker_management"
    SCHEDULE_SOLVER = "schedule_solver"


class ComplexityTier(str, Enum):
    LOW = "low"
    HIGH = "high"


class IntentClassificationResult(BaseModel):
    intent: CopilotIntent = Field(
        ..., description="The calculated target domain category."
    )
    complexity: ComplexityTier = Field(
        ...,
        description=(
            "low for single-entity operations (at most one simple lookup before "
            "one write on the same entity), single-tool lookups, and trivial "
            "lookup→mutate pairs. high for operations requiring entity creation "
            "as a prerequisite, batch mutations across multiple workers, "
            "cross-domain operations, or complex date resolution chains."
        ),
    )
