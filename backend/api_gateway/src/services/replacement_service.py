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
    Constraints,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
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
    build_dates_list,
    build_worker_ids_to_worker_dates,
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

        # Verify that all workers and shifts referenced by the target
        # assignments were fetched
        worker_ids_fetched = {w.id for w in workers}
        shift_ids_fetched = {s.id for s in shifts}

        referenced_worker_ids = {a.worker_id for a in assignments_target}
        referenced_shift_ids = {a.shift_id for a in assignments_target}

        missing_worker_ids = referenced_worker_ids - worker_ids_fetched
        missing_shift_ids = referenced_shift_ids - shift_ids_fetched

        if missing_worker_ids:
            raise ValueError(
                f"Workers for assignments not found: "
                f"{', '.join(sorted(missing_worker_ids))}"
            )
        if missing_shift_ids:
            raise ValueError(
                f"Shifts for assignments not found: "
                f"{', '.join(sorted(missing_shift_ids))}"
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

    def _filter_constraint_sum_for_assignment(
        self,
        constraint_sum: ConstraintSum,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> ConstraintSum | None:
        """Filter a ConstraintSum to only include periods containing the
        target date and shift.

        Args:
            constraint_sum: The ConstraintSum to filter
            assignment_date_iso: Assignment date in ISO format
                (e.g., "2025-01-15")
            assignment_shift_id: Assignment shift ID

        Returns:
            A new ConstraintSum with filtered constraint_variables and
            target_values, or None if no periods match.
        """
        filtered_variables = []
        filtered_target_values = []

        for i, period_vars in enumerate(constraint_sum.constraint_variables):
            # Check if any tuple in this period matches the assignment
            # date and shift
            has_match = any(
                var[1] == assignment_date_iso and var[2] == assignment_shift_id
                for var in period_vars
            )

            if has_match:
                filtered_variables.append(period_vars)
                filtered_target_values.append(constraint_sum.target_values[i])

        # If no periods match, return None
        if not filtered_variables:
            return None

        # Create a new ConstraintSum with filtered data
        return ConstraintSum(
            id=constraint_sum.id,
            constraint_type=constraint_sum.constraint_type,
            operator=constraint_sum.operator,
            target_value=constraint_sum.target_value,
            target_unit=constraint_sum.target_unit,
            active=constraint_sum.active,
            hard=constraint_sum.hard,
            priority=constraint_sum.priority,
            penalty=constraint_sum.penalty,
            schedule_id=constraint_sum.schedule_id,
            constraint_build_id=constraint_sum.constraint_build_id,
            constraint_variables=filtered_variables,
            target_values=filtered_target_values,
        )

    def _filter_all_constraint_sums(
        self,
        constraints: Constraints,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> List[ConstraintSum]:
        """Filter all ConstraintSum objects to only include those relevant
        to the assignment.

        Args:
            constraints: The Constraints object containing all constraint types
            assignment_date_iso: Assignment date in ISO format
            assignment_shift_id: Assignment shift ID

        Returns:
            A filtered list of ConstraintSum objects, excluding any that
            have no matching periods.
        """
        filtered_sums = []

        for constraint_sum in constraints.sum:
            filtered_sum = self._filter_constraint_sum_for_assignment(
                constraint_sum, assignment_date_iso, assignment_shift_id
            )
            if filtered_sum is not None:
                filtered_sums.append(filtered_sum)

        return filtered_sums

    def _filter_constraint_seq_for_assignment(
        self,
        constraint_seq: ConstraintSeq,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> ConstraintSeq | None:
        """Filter a ConstraintSeq to only include periods containing the
        target date and shift.

        Args:
            constraint_seq: The ConstraintSeq to filter
            assignment_date_iso: Assignment date in ISO format
                (e.g., "2025-01-15")
            assignment_shift_id: Assignment shift ID

        Returns:
            A new ConstraintSeq with filtered constraint_variables,
            or None if no periods match.
        """
        filtered_variables = []

        for period_vars in constraint_seq.constraint_variables:
            # Check if any tuple in this period matches the assignment
            # date and shift
            has_match = any(
                var[1] == assignment_date_iso and var[2] == assignment_shift_id
                for var in period_vars
            )

            if has_match:
                filtered_variables.append(period_vars)

        # If no periods match, return None
        if not filtered_variables:
            return None

        # Create a new ConstraintSeq with filtered data
        return ConstraintSeq(
            id=constraint_seq.id,
            constraint_type=constraint_seq.constraint_type,
            operator=constraint_seq.operator,
            target_value=constraint_seq.target_value,
            target_unit=constraint_seq.target_unit,
            active=constraint_seq.active,
            hard=constraint_seq.hard,
            priority=constraint_seq.priority,
            penalty=constraint_seq.penalty,
            schedule_id=constraint_seq.schedule_id,
            constraint_build_id=constraint_seq.constraint_build_id,
            constraint_variables=filtered_variables,
        )

    def _filter_all_constraint_seqs(
        self,
        constraints: Constraints,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> List[ConstraintSeq]:
        """Filter all ConstraintSeq objects to only include those relevant
        to the assignment.

        Args:
            constraints: The Constraints object containing all constraint types
            assignment_date_iso: Assignment date in ISO format
            assignment_shift_id: Assignment shift ID

        Returns:
            A filtered list of ConstraintSeq objects, excluding any that
            have no matching periods.
        """
        filtered_seqs = []

        for constraint_seq in constraints.seq:
            filtered_seq = self._filter_constraint_seq_for_assignment(
                constraint_seq, assignment_date_iso, assignment_shift_id
            )
            if filtered_seq is not None:
                filtered_seqs.append(filtered_seq)

        return filtered_seqs

    def _filter_constraint_ord_for_assignment(
        self,
        constraint_ord: ConstraintOrd,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> ConstraintOrd | None:
        """Filter a ConstraintOrd to only include tuples containing the
        target date and shift.

        Args:
            constraint_ord: The ConstraintOrd to filter
            assignment_date_iso: Assignment date in ISO format
                (e.g., "2025-01-15")
            assignment_shift_id: Assignment shift ID

        Returns:
            A new ConstraintOrd with filtered constraint_variables,
            or None if no tuples match.
        """
        filtered_variables = []

        for ref_tuple, rel_tuple in constraint_ord.constraint_variables:
            # Check if either the reference or relative tuple matches
            # the assignment date and shift
            ref_match = (
                ref_tuple[1] == assignment_date_iso
                and ref_tuple[2] == assignment_shift_id
            )
            rel_match = (
                rel_tuple[1] == assignment_date_iso
                and rel_tuple[2] == assignment_shift_id
            )

            if ref_match or rel_match:
                filtered_variables.append((ref_tuple, rel_tuple))

        # If no tuples match, return None
        if not filtered_variables:
            return None

        # Create a new ConstraintOrd with filtered data
        return ConstraintOrd(
            id=constraint_ord.id,
            constraint_type=constraint_ord.constraint_type,
            operator=constraint_ord.operator,
            target_value=constraint_ord.target_value,
            target_unit=constraint_ord.target_unit,
            active=constraint_ord.active,
            hard=constraint_ord.hard,
            priority=constraint_ord.priority,
            penalty=constraint_ord.penalty,
            schedule_id=constraint_ord.schedule_id,
            constraint_build_id=constraint_ord.constraint_build_id,
            shift_reference_ids=constraint_ord.shift_reference_ids,
            shift_relative_ids=constraint_ord.shift_relative_ids,
            interval=constraint_ord.interval,
            constraint_variables=filtered_variables,
        )

    def _filter_all_constraint_ords(
        self,
        constraints: Constraints,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> List[ConstraintOrd]:
        """Filter all ConstraintOrd objects to only include those relevant
        to the assignment.

        Args:
            constraints: The Constraints object containing all constraint types
            assignment_date_iso: Assignment date in ISO format
            assignment_shift_id: Assignment shift ID

        Returns:
            A filtered list of ConstraintOrd objects, excluding any that
            have no matching tuples.
        """
        filtered_ords = []

        for constraint_ord in constraints.ord:
            filtered_ord = self._filter_constraint_ord_for_assignment(
                constraint_ord, assignment_date_iso, assignment_shift_id
            )
            if filtered_ord is not None:
                filtered_ords.append(filtered_ord)

        return filtered_ords

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

        dates_hist = build_dates_list(
            start_date=min_hist_date,
            end_date=assignment.date - timedelta(days=1),
        )

        periods_weekly = build_periods_weekly(
            dates_hist=dates_hist, dates_campaign=[assignment.date]
        )
        periods_monthly = build_periods_monthly(
            dates_hist=dates_hist, dates_campaign=[assignment.date]
        )
        periods_yearly = build_periods_yearly(
            dates_hist=dates_hist, dates_campaign=[assignment.date]
        )

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=assignment.date,
            end_date=assignment.date,
            workers=replacement_data.workers,
            assignments=replacement_data.assignments,
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

        # Filter ConstraintSum to only include those relevant to the assignment
        constraints.sum = self._filter_all_constraint_sums(
            constraints, assignment.date.isoformat(), assignment.shift_id
        )

        # Filter ConstraintSeq to only include those relevant to the assignment
        constraints.seq = self._filter_all_constraint_seqs(
            constraints, assignment.date.isoformat(), assignment.shift_id
        )

        # Filter ConstraintOrd to only include those relevant to the assignment
        constraints.ord = self._filter_all_constraint_ords(
            constraints, assignment.date.isoformat(), assignment.shift_id
        )
