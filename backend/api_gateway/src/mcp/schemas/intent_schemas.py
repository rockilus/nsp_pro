"""Structured classification schemas for the copilot intent router.

Used with LiteLLM's ``response_format`` to force deterministic classifier
output instead of fragile string-splitting on pipe-delimited tokens.
"""

from enum import Enum

from pydantic import BaseModel, Field


class CopilotIntent(str, Enum):
    GENERAL_QA = "general_qa"
    ROSTER_MODIFICATION = "roster_modification"
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
            "low for basic Q&A, single-tool lookups, and simple single-tool "
            "mutations. high for multi-step data mutations that require prior "
            "read-side resolution (date calculation, worker lookup, dimension "
            "lookup) before a write can be executed."
        ),
    )
