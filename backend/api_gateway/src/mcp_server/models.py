from pydantic import BaseModel, Field


class WeeklySlotPreference(BaseModel):
    """A weekly availability restriction for a specific day and time slot."""

    day_of_week: int = Field(description="Day index: 0=Monday, 1=Tuesday, …, 6=Sunday")
    slot: str = Field(description="Time slot: one of morning, afternoon, or night")
    restriction: str = Field(
        description=(
            "Restriction type: no_work (cannot work at all), "
            "no_normal (cannot work a normal shift), "
            "no_duty (cannot work a duty shift), "
            "no_specific (cannot work specific shift IDs)"
        )
    )


class DimensionValue(BaseModel):
    """A custom dimension value assigned to this team member."""

    dimension_id: str = Field(description="Unique dimension identifier")
    dimension_name: str = Field(
        description="Human-readable dimension name, e.g. 'Location'"
    )
    entry_ids: list[str] = Field(
        description="Selected dim entry IDs, empty for non-dropdown dimensions"
    )
    entry_names: list[str] = Field(
        description="Selected dim entry names, e.g. ['Paris', 'London']"
    )
    raw_value: str | int | float | bool | None = Field(
        description=(
            "Raw value for free-text, numeric, or boolean dimensions; "
            "null for dropdown (DIM_ENTRIES) dimensions"
        )
    )


class WorkerRosterItem(BaseModel):
    """A team member with full scheduling profile, specialties, and custom
    dimensions. This is the primary lookup for any question about workers
    — who they are, what specialties they hold, when they joined, and what
    custom attributes they have assigned.
    """

    id: str = Field(description="Unique worker identifier")
    name: str = Field(description="Full display name of the team member")
    acronym: str = Field(
        description="Short identifier, e.g. initials or abbreviated name"
    )
    employment_start_date: str = Field(
        description="ISO date string (YYYY-MM-DD) when this member joined"
    )
    employment_end_date: str | None = Field(
        description="ISO date string when employment ends; null if active"
    )
    weekly_hours: int = Field(description="Contract hours per week")
    weekly_hours_desired: int = Field(
        description="Desired hours per week, may differ from contract"
    )
    duties_per_month: int = Field(description="Target number of duty shifts per month")
    annual_leave: int = Field(description="Annual leave allowance in days")
    has_user_account: bool = Field(
        description="Whether this member is linked to a Rockilus user account"
    )
    specialties: list[str] = Field(
        description="Human-readable specialty names, e.g. ['Pediatry', 'Cardiology']"
    )
    dimensions: list[DimensionValue] = Field(
        description=(
            "Custom dimensions assigned to this member. Each entry represents "
            "one dimension (e.g. Location → Paris, Seniority → Senior). "
            "Use entry_names to filter by human-readable value."
        )
    )
    weekly_preferences: list[WeeklySlotPreference] | None = Field(
        description=(
            "Weekly availability restrictions. Each entry blocks a specific "
            "day-and-slot combination. null means no preferences configured."
        )
    )
