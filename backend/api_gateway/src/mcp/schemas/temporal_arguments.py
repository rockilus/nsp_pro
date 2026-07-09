"""Strict argument schemas for the copilot date-resolution tool.

Rich ``Field`` descriptions double as instructions that guide the LLM's
parameter selection. The tool is read-only — no database mutations.
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

WEEKDAY_NAMES = Literal[
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
]

CALCULATION_TYPE = Literal["day_offset", "week_offset", "month_ordinal"]


class CalculateRelativeDateArgs(BaseModel):
    """Compute exact UTC calendar dates from relative expressions.

    The copilot must call this for EVERY relative date the user mentions
    ('tomorrow', 'next Monday', 'first Wednesday of next month') before
    passing the result to any other tool.
    """

    model_config = ConfigDict(extra="forbid")

    calculation_type: CALCULATION_TYPE = Field(
        ...,
        description="Which date resolution strategy to use: 'day_offset' for "
        "'tomorrow'/'yesterday'/'in 3 days', 'week_offset' for 'next Monday'/"
        "'this Friday', 'month_ordinal' for 'first Wednesday of next month'.",
    )
    target_weekday: Optional[WEEKDAY_NAMES] = Field(
        None,
        description="The English name of the target day. Required for "
        "'week_offset' and 'month_ordinal'. Always map French/Spanish weekday "
        "names (lundi/Monday, mercredi/Wednesday) to English before passing.",
    )
    day_offset: Optional[int] = Field(
        None,
        description="Required for 'day_offset'. 0 = today, 1 = tomorrow, "
        "-1 = yesterday, 3 = three days from now, -7 = one week ago.",
    )
    week_offset: Optional[int] = Field(
        None,
        description="Required for 'week_offset'. 0 = this current week "
        "(Monday-Sunday), 1 = next week, 2 = the week after next, and so on.",
    )
    month_offset: Optional[int] = Field(
        None,
        description="Required for 'month_ordinal'. 0 = current month, "
        "1 = next month, 2 = the month after next, and so on.",
    )
    ordinal_position: Optional[int] = Field(
        None,
        description="Required for 'month_ordinal'. 1 = first occurrence of "
        "the target_weekday in the target month, 2 = second, 3 = third, "
        "4 = fourth, 5 = fifth (only possible for months with 5 of that day).",
    )
