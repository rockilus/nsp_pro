from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import List

from shared.augment.cb_to_cb_augmented import cb_to_cb_augmented
from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
    parse_constraints,
)
from shared.schemas.core import (
    Assignment,
    Attribute,
    Breach,
    ConfigurationConstraintPenalty,
    ConstraintBuild,
    ConstraintBuildAugmented,
    CoveragePenalty,
    Dimension,
    DimEntry,
    Penalties,
    Penalty,
    Shift,
    Specialty,
    SystemConstraintPenalty,
    UserConstraintPenalty,
    Worker,
)
from shared.utils import (
    build_periods_monthly,
    build_periods_weekly,
    build_periods_yearly,
)

from src.services.base_service import BaseService


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
class ReplacedShift:
    shift_id: str
    filter_labels: List[str]


@dataclass
class ReplacementData:
    workers: List[Worker]
    shifts: List[Shift]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    specialties: List[Specialty]
    constraints: List[ConstraintBuild]
    assignments: List[Assignment]


class ReplacementService(BaseService):
    def get_replacement_candidates(
        self, assignment_id: str, team_id: str
    ) -> List[ReplacementCandidate]:
        replacement_data = self._fetch_replacement_data(
            assignment_ids=[assignment_id],
            team_id=team_id,
        )
        # Further processing to determine replacement candidates would go here.
        # For brevity, this is left as a placeholder.
        return []

    def get_assignment_swap_info(
        self,
        assignments_1_ids: List[str],
        assignments_2_ids: List[str],
        team_id: str,
    ) -> None:
        replacement_data = self._fetch_replacement_data(
            assignment_ids=assignments_1_ids + assignments_2_ids,
            team_id=team_id,
        )

    def _fetch_replacement_data(
        self, assignment_ids: List[str], team_id: str
    ) -> ReplacementData:
        if not assignment_ids:
            raise ValueError("No assignment id provided")

        assignments_target = (
            self.collection.assignment_db.get_assignments_by_ids(
                assignment_ids, raise_on_missing=True
            )
        )

        workers = self.collection.worker_db.get_workers_not_deleted(
            team_id=team_id
        )
        shifts = self.collection.shift_db.get_shifts_not_deleted(
            team_id=team_id
        )

        # Verify that all workers and shifts referenced by the target assignments were fetched
        worker_ids_fetched = {w.id for w in workers}
        shift_ids_fetched = {s.id for s in shifts}

        referenced_worker_ids = {a.worker_id for a in assignments_target}
        referenced_shift_ids = {a.shift_id for a in assignments_target}

        missing_worker_ids = referenced_worker_ids - worker_ids_fetched
        missing_shift_ids = referenced_shift_ids - shift_ids_fetched

        if missing_worker_ids:
            raise ValueError(
                f"Workers for assignments not found: {', '.join(sorted(missing_worker_ids))}"
            )
        if missing_shift_ids:
            raise ValueError(
                f"Shifts for assignments not found: {', '.join(sorted(missing_shift_ids))}"
            )

        dimensions = self.collection.dimension_db.get_dimensions(
            team_id=team_id
        )
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
            [dim.id for dim in dimensions]
        )
        attributes = self.collection.attribute_db.get_attributes_by_owner_ids(
            [w.id for w in workers] + [s.id for s in shifts]
        )
        specialties = self.collection.specialty_db.get_specialties_by_team_id(
            team_id=team_id
        )
        constraints = (
            self.collection.constraint_build_db.get_constraint_builds(
                team_id=team_id
            )
        )

        dates = [a.date for a in assignments_target]
        earliest_date = min(dates)
        latest_date = max(dates)

        try:
            earliest_date_minus_1_year = earliest_date.replace(
                year=earliest_date.year - 1
            )
        except ValueError:
            # Handles Feb 29 -> fallback to Feb 28 on non-leap year
            earliest_date_minus_1_year = earliest_date.replace(
                month=2, day=28, year=earliest_date.year - 1
            )

        assignments = self.collection.assignment_db.get_assignments_by_dates(
            team_id=team_id,
            start_date=earliest_date_minus_1_year,
            end_date=latest_date,
        )

        return ReplacementData(
            workers=workers,
            shifts=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
            specialties=specialties,
            constraints=constraints,
            assignments=assignments,
        )

    def _process_replacement_data(
        self, assignment: Assignment, replacement_data: ReplacementData
    ):
        dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
            owners=replacement_data.workers,
            dimensions=replacement_data.dimensions,
            dim_entries=replacement_data.dim_entries,
            attributes=replacement_data.attributes,
        )
        dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
            owners=replacement_data.shifts,
            dimensions=replacement_data.dimensions,
            dim_entries=replacement_data.dim_entries,
            attributes=replacement_data.attributes,
        )

        cbs_augmented = [
            cb_to_cb_augmented(
                cb=cb,
                workers=replacement_data.workers,
                shifts=replacement_data.shifts,
                dimensions=replacement_data.dimensions,
                dim_entries=replacement_data.dim_entries,
                attributes=replacement_data.attributes,
                specialties=replacement_data.specialties,
            )
            for cb in replacement_data.constraints
        ]
        cbs_augmented = [cb for cb in cbs_augmented if cb.active]
        penalties = Penalties(
            user_constraint=UserConstraintPenalty(
                eve=Penalty(hard=0, soft=0),
                fai=Penalty(hard=0, soft=0),
                fil=Penalty(hard=0, soft=0),
                ord=Penalty(hard=0, soft=0),
                seq=Penalty(hard=0, soft=0),
                sum=Penalty(hard=0, soft=0),
                request=Penalty(hard=0, soft=0),
            ),
            configuration_constraint=ConfigurationConstraintPenalty(
                coverage=CoveragePenalty(duty=0, normal=0),
                duty_recup=0,
                worker_shift_filter=0,
                link_shift=0,
                weekly_worktime_max=0,
                weekly_worktime_desired=0,
                weekly_worktime_contract=0,
                monthly_duties_max=0,
                monthly_duties_desired=0,
            ),
            system_constraint=SystemConstraintPenalty(
                weekly_target_work_time=0,
                monthly_target_nb_duties=0,
                max_weekly_nb_duties=0,
                max_week_day_nb_duties=0,
                special_days_target_nb_duties=0,
            ),
        )

        try:
            a_date_minus_1_year = assignment.date.replace(
                year=assignment.date.year - 1
            )
        except ValueError:
            # Handles Feb 29 -> fallback to Feb 28 on non-leap year
            a_date_minus_1_year = assignment.date.replace(
                month=2, day=28, year=assignment.date.year - 1
            )

        min_hist_date = min(
            a_date_minus_1_year,
            min(a.date for a in replacement_data.assignments),
        )

        delta = assignment.date - min_hist_date
        dates_hist = [
            min_hist_date + timedelta(days=i) for i in range(delta.days + 1)
        ]

        periods_weekly = build_periods_weekly(
            dates_hist=dates_hist, dates_campaign=[assignment.date]
        )
        periods_monthly = build_periods_monthly(
            dates_hist=dates_hist, dates_campaign=[assignment.date]
        )
        periods_yearly = build_periods_yearly(
            dates_hist=dates_hist, dates_campaign=[assignment.date]
        )

        constraints = parse_constraints(
            cbas=cbs_augmented,
            schedule_id="",
            workers=replacement_data.workers,
            worker_dim_dict=dim_to_attr_value_to_worker,
            dates_hist=dates_hist,
            dates_campaign=[assignment.date],
            periods_weekly=periods_weekly,
            periods_monthly=periods_monthly,
            periods_yearly=periods_yearly,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=replacement_data.shifts,
            shift_dim_dict=dim_to_attr_value_to_shift,
            penalties=penalties,
        )
