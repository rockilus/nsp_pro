from dataclasses import dataclass
from typing import List
from enum import Enum
from datetime import datetime
from shared.schemas.core import Breach


class ReplacementCategory(Enum):
    CANT_DO = "cant_do"
    COULD_DO = "could_do"
    CAN_DO = "can_do"


@dataclass
class FilterHits:
    isnt_filtered_out: bool
    filter_labels: List[str]


@dataclass
class OverlapHits:
    hasnt_overlap: bool
    overlap_assignment_ids: List[str]


@dataclass
class ConstraintHits:
    meets_constraints: bool
    breaches: List[Breach]


@dataclass
class RequestHits:
    has_no_request_conflict: bool
    conflicting_request_ids: List[str]


@dataclass
class MonthlyDutiesImplications:
    new_number_monthly_duties: int
    new_monthly_duties_delta: int


@dataclass
class WeeklyWorkTimeImplications:
    new_weekly_worked_minutes: int
    new_weekly_time_delta_minutes: int


@dataclass
class LTMIndicator:
    count: int
    last_date: datetime | None


@dataclass
class ReplacementImplications:
    # Can't do
    is_employed: bool
    has_specialty: bool
    isnt_on_leave: bool
    filter_hits: FilterHits
    is_on_leave: bool
    overlap_minutes: OverlapHits
    hard_constraint_hits: ConstraintHits
    request_hits: RequestHits

    # Could do
    soft_constraint_hits: ConstraintHits
    new_monthly_duties: MonthlyDutiesImplications
    new_weekly_time: WeeklyWorkTimeImplications

    # Indicators
    nb_times_did_shift_ltm: LTMIndicator
    nb_times_worked_weekday_ltm: LTMIndicator


@dataclass
class ReplacementCandidate:
    worker_id: str
    worker_name: str
    rank: int  # Lower is better, 0 for current assignment
    replacement_category: ReplacementCategory
    replacement_implications: ReplacementImplications


@dataclass
class ReplacemedShift:
    shift_id: str
    filter_labels: List[str]
