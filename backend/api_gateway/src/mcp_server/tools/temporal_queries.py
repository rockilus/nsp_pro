"""Deterministic relative-date calculator for the copilot agent.

Offloads all calendar arithmetic from the LLM to Python's standard library.
"""

import calendar
from datetime import date, datetime, timedelta, timezone
from typing import Any

from pydantic import ValidationError
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_error

from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.mcp.schemas.temporal_arguments import (
    CalculateRelativeDateArgs,
)
from src.security.user_context import UserContext

# Python's calendar.MONDAY = 0 .. calendar.SUNDAY = 6
_WEEKDAY_TO_CAL: dict[str, int] = {
    "Monday": calendar.MONDAY,
    "Tuesday": calendar.TUESDAY,
    "Wednesday": calendar.WEDNESDAY,
    "Thursday": calendar.THURSDAY,
    "Friday": calendar.FRIDAY,
    "Saturday": calendar.SATURDAY,
    "Sunday": calendar.SUNDAY,
}


def _anchor_date() -> date:
    """Return the current UTC date, matching the copilot's context anchor."""
    return datetime.now(timezone.utc).date()


def _resolve_day_offset(anchor: date, day_offset: int) -> date:
    return anchor + timedelta(days=day_offset)


def _resolve_week_offset(anchor: date, target_weekday: str, week_offset: int) -> date:
    """Compute a date relative to the current week's Monday anchor.

    "This week" (week_offset=0) starts on the Monday of the week containing
    ``anchor``. "Next week" (week_offset=1) is that Monday + 7 days, etc.
    """
    weekday_index = _WEEKDAY_TO_CAL[target_weekday]
    current_monday = anchor - timedelta(days=anchor.weekday())
    return current_monday + timedelta(weeks=week_offset, days=weekday_index)


def _resolve_month_ordinal(
    anchor: date, target_weekday: str, month_offset: int, ordinal_position: int
) -> date:
    """Locate the Nth occurrence of ``target_weekday`` in a target month."""
    target_year = anchor.year
    target_month = anchor.month + month_offset
    while target_month > 12:
        target_month -= 12
        target_year += 1

    weekday_index = _WEEKDAY_TO_CAL[target_weekday]
    cal = calendar.Calendar(firstweekday=calendar.MONDAY)
    month_matrix = cal.monthdays2calendar(target_year, target_month)

    matches: list[date] = []
    for week in month_matrix:
        for day, wday in week:
            if day != 0 and wday == weekday_index:
                matches.append(date(target_year, target_month, day))

    try:
        return matches[ordinal_position - 1]
    except IndexError:
        raise ValueError(
            f"No {ordinal_position}{_ordinal_suffix(ordinal_position)} "
            f"{target_weekday} in {date(target_year, target_month, 1):%B %Y}"
        )


def _ordinal_suffix(n: int) -> str:
    if 11 <= n % 100 <= 13:
        return "th"
    return {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


async def calculate_relative_date(
    db: DatabaseCollections,
    user_context: UserContext,
    cerbos: CerbosAuthzService,
    **kwargs: Any,
) -> dict[str, Any]:
    """Compute an exact ISO date from the user's relative date expression.

    Read-only tool — no authorization check needed, no database access.
    """
    try:
        args = CalculateRelativeDateArgs(**kwargs)
    except ValidationError as exc:
        return {
            "status": "error",
            "message": f"Invalid date calculation arguments: {exc}",
        }

    anchor = _anchor_date()

    try:
        if args.calculation_type == "day_offset":
            if args.day_offset is None:
                return {
                    "status": "error",
                    "message": "Missing required 'day_offset' parameter.",
                }
            result = _resolve_day_offset(anchor, args.day_offset)
        elif args.calculation_type == "week_offset":
            if args.target_weekday is None or args.week_offset is None:
                return {
                    "status": "error",
                    "message": (
                        "Missing required parameters: both 'target_weekday' "
                        "and 'week_offset' are required for week_offset."
                    ),
                }
            result = _resolve_week_offset(anchor, args.target_weekday, args.week_offset)
        elif args.calculation_type == "month_ordinal":
            if (
                args.target_weekday is None
                or args.month_offset is None
                or args.ordinal_position is None
            ):
                return {
                    "status": "error",
                    "message": (
                        "Missing required parameters: 'target_weekday', "
                        "'month_offset', and 'ordinal_position' are all "
                        "required for month_ordinal."
                    ),
                }
            result = _resolve_month_ordinal(
                anchor,
                args.target_weekday,
                args.month_offset,
                args.ordinal_position,
            )
        else:
            return {
                "status": "error",
                "message": (
                    f"Unknown calculation_type '{args.calculation_type}'. "
                    "Must be 'day_offset', 'week_offset', or 'month_ordinal'."
                ),
            }

        return {"status": "success", "calculated_date": result.isoformat()}

    except ValueError as exc:
        log_error(f"Date calculation failed: {exc}")
        return {"status": "error", "message": str(exc)}
