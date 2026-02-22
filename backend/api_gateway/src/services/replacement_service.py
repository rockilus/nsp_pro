from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Set, Tuple

from shared.augment.cb_to_cb_augmented import cb_to_cb_augmented
from shared.augment.r_to_r_augmented import r_to_r_augmented
from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
    parse_constraints,
)
from shared.constraint_parser.parse_selected_shifts import (
    parse_selected_shifts,
)
from shared.schemas.core import (
    Assignment,
    AssignmentImplication,
    AssignmentSource,
    Attribute,
    Breach,
    ConfigurationConstraintPenalty,
    ConstraintBuild,
    ConstraintFil,
    ConstraintHits,
    ConstraintOperator,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    CoveragePenalty,
    Dimension,
    DimEntry,
    FilterHits,
    LTMIndicator,
    MonthlyDutiesImplications,
    OverlapHits,
    Penalties,
    Penalty,
    ReplacementCandidate,
    ReplacementCategory,
    ReplacementImplications,
    Request,
    RequestAugmented,
    RequestHits,
    RequestStatus,
    RequestType,
    Shift,
    ShiftRestType,
    ShiftType,
    Specialty,
    SwapAssignmentInfo,
    SwapValidationResult,
    SystemConstraintPenalty,
    UserConstraintPenalty,
    Variable,
    WeeklyWorkTimeImplications,
    Worker,
)
from shared.schemas.core.breach import ObjectiveCategory
from shared.utils import (
    BoolSharedPolicy,
    build_dates_list,
    build_periods_monthly,
    build_periods_weekly,
    build_periods_yearly,
    build_worker_ids_to_worker_dates,
    build_worker_shift_filters,
)

from src.services.base_service import BaseService

# pylint: disable=too-many-instance-attributes, too-many-locals, too-many-branches


@dataclass
class ReplacedShift:
    shift_id: str
    filter_labels: List[str]


@dataclass
class ReplacementContext:
    """Pre-computed context for evaluating replacement candidates."""

    target_assignment: Assignment
    target_shift: Shift
    assignment_date: date
    workers: List[Worker]
    shifts: List[Shift]
    constraints: Constraints
    a_filtered_out: List[tuple[str, str, str]]
    assignments: List[Assignment]
    requests: List[Request]
    requests_augmented: List[RequestAugmented]
    assignment_times: Dict[str, tuple[datetime, datetime]]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    shift_dim_dict: Dict
    assignment_tuples: Set[Tuple[str, str, str]]


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
    requests: List[Request]


@dataclass
class SwapContext:
    """Pre-computed context for evaluating a swap between two workers."""

    # Workers involved in the swap
    worker_a: Worker
    worker_b: Worker

    # Assignment sets for the swap
    all_current_assignments: List[Assignment]  # All current assignments
    all_swapped_assignments: List[Assignment]  # All after swap
    worker_a_current_assignments: List[Assignment]  # A's being swapped
    worker_b_current_assignments: List[Assignment]  # B's being swapped
    worker_a_swapped_assignments: List[Assignment]  # New for A (from B)
    worker_b_swapped_assignments: List[Assignment]  # New for B (from A)

    # Shared context data
    workers: List[Worker]
    shifts: List[Shift]
    constraints: Constraints
    a_filtered_out: List[tuple[str, str, str]]
    requests: List[Request]
    requests_augmented: List[RequestAugmented]
    assignment_times: Dict[str, tuple[datetime, datetime]]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    shift_dim_dict: Dict

    # Assignment tuples for quick lookup
    current_assignment_tuples: Set[Tuple[str, str, str]]
    swapped_assignment_tuples: Set[Tuple[str, str, str]]


# pylint: disable=too-many-lines, too-few-public-methods
class ReplacementService(BaseService):
    def get_replacement_candidates(
        self, assignment_id: str, team_id: str
    ) -> List[ReplacementCandidate]:
        replacement_data = self._fetch_replacement_data(
            assignment_ids=[assignment_id],
            team_id=team_id,
        )

        # Get the target assignment
        assignment = next(
            (a for a in replacement_data.assignments if a.id == assignment_id),
            None,
        )
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        # Process replacement data to build constraints and filters
        constraints, a_filtered_out, shift_dim_dict = self._process_replacement_data(
            assignment, replacement_data
        )

        # Build replacement context once
        context = self._build_replacement_context(
            assignment=assignment,
            replacement_data=replacement_data,
            constraints=constraints,
            a_filtered_out=a_filtered_out,
            shift_dim_dict=shift_dim_dict,
        )

        # Build replacement candidates for each worker
        candidates = []
        for worker in replacement_data.workers:
            implications = self._build_replacement_implications(
                worker=worker,
                context=context,
            )
            category = self._determine_replacement_category(implications)
            most_constraining_reason = (
                ReplacementCandidate.compute_most_constraining_reason(implications)
            )
            candidate = ReplacementCandidate(
                worker_id=worker.id,
                worker_name=worker.name,
                rank=0,  # Will be assigned by _rank_candidates
                replacement_category=category,
                replacement_implications=implications,
                most_constraining_reason=most_constraining_reason,
            )
            candidates.append(candidate)

        # Rank candidates based on their implications
        ranked_candidates = self._rank_candidates(
            candidates=candidates,
            current_worker_id=assignment.worker_id,
        )

        return ranked_candidates

    # pylint: disable=too-many-locals
    def validate_assignment_swap(
        self,
        worker_a_assignment_ids: List[str],
        worker_b_assignment_ids: List[str],
        team_id: str,
    ) -> SwapValidationResult:
        """
        Validate whether two workers can swap their assignments.

        Args:
            worker_a_assignment_ids: List of assignment IDs for worker A
            worker_b_assignment_ids: List of assignment IDs for worker B
            team_id: Team ID

        Returns:
            SwapValidationResult with detailed implications for both workers
        """
        # Fetch all data for both sets of assignments
        all_assignment_ids = worker_a_assignment_ids + worker_b_assignment_ids
        replacement_data = self._fetch_replacement_data(
            assignment_ids=all_assignment_ids,
            team_id=team_id,
        )

        # Get the actual assignments
        worker_a_assignments = [
            a for a in replacement_data.assignments if a.id in worker_a_assignment_ids
        ]
        worker_b_assignments = [
            a for a in replacement_data.assignments if a.id in worker_b_assignment_ids
        ]

        # Validate we found all assignments
        if len(worker_a_assignments) != len(worker_a_assignment_ids):
            missing = set(worker_a_assignment_ids) - {
                a.id for a in worker_a_assignments
            }
            raise ValueError(f"Worker A assignments not found: {missing}")
        if len(worker_b_assignments) != len(worker_b_assignment_ids):
            missing = set(worker_b_assignment_ids) - {
                a.id for a in worker_b_assignments
            }
            raise ValueError(f"Worker B assignments not found: {missing}")

        # Verify assignments belong to exactly two workers
        worker_a_id = worker_a_assignments[0].worker_id
        worker_b_id = worker_b_assignments[0].worker_id

        if any(a.worker_id != worker_a_id for a in worker_a_assignments):
            raise ValueError("All worker A assignments must belong to the same worker")
        if any(a.worker_id != worker_b_id for a in worker_b_assignments):
            raise ValueError("All worker B assignments must belong to the same worker")
        if worker_a_id == worker_b_id:
            raise ValueError("Cannot swap assignments of the same worker")

        # Get worker objects
        worker_a = next(
            (w for w in replacement_data.workers if w.id == worker_a_id), None
        )
        worker_b = next(
            (w for w in replacement_data.workers if w.id == worker_b_id), None
        )

        if not worker_a or not worker_b:
            raise ValueError("Worker not found in team")

        # Process replacement data for multiple assignments
        all_assignments = worker_a_assignments + worker_b_assignments
        constraints, a_filtered_out, shift_dim_dict = (
            self._process_replacement_data_for_multiple(
                assignments=all_assignments,
                replacement_data=replacement_data,
            )
        )

        # Build swap context
        swap_context = self._build_swap_context(
            worker_a_assignments=worker_a_assignments,
            worker_b_assignments=worker_b_assignments,
            worker_a=worker_a,
            worker_b=worker_b,
            replacement_data=replacement_data,
            constraints=constraints,
            a_filtered_out=a_filtered_out,
            shift_dim_dict=shift_dim_dict,
        )

        # Evaluate implications for worker A
        worker_a_info = self._build_swap_implications_for_worker(
            worker=worker_a,
            worker_assignments=swap_context.worker_a_current_assignments,
            swapped_assignments=swap_context.worker_a_swapped_assignments,
            swap_context=swap_context,
        )

        # Evaluate implications for worker B
        worker_b_info = self._build_swap_implications_for_worker(
            worker=worker_b,
            worker_assignments=swap_context.worker_b_current_assignments,
            swapped_assignments=swap_context.worker_b_swapped_assignments,
            swap_context=swap_context,
        )

        # Determine if swap is valid (both workers pass all hard constraints)
        worker_a_can_do_swap = all(
            self._can_do_assignment(ai.implications) for ai in worker_a_info.post_swap
        )
        worker_b_can_do_swap = all(
            self._can_do_assignment(ai.implications) for ai in worker_b_info.post_swap
        )

        is_valid = worker_a_can_do_swap and worker_b_can_do_swap

        # Build validation key for i18n
        if is_valid:
            validation_key = "swap_valid_both"
        elif not worker_a_can_do_swap and not worker_b_can_do_swap:
            validation_key = "swap_invalid_both"
        elif not worker_a_can_do_swap:
            validation_key = "swap_invalid_worker_a"
        else:
            validation_key = "swap_invalid_worker_b"

        return SwapValidationResult(
            is_valid=is_valid,
            worker_a_info=worker_a_info,
            worker_b_info=worker_b_info,
            validation_key=validation_key,
        )

    # def get_assignment_swap_info(
    #     self,
    #     assignments_1_ids: List[str],
    #     assignments_2_ids: List[str],
    #     team_id: str,
    # ) -> None:
    #     _replacement_data = self._fetch_replacement_data(
    #         assignment_ids=assignments_1_ids + assignments_2_ids,
    #         team_id=team_id,
    #     )

    # pylint: disable=too-many-locals
    def _fetch_replacement_data(
        self, assignment_ids: List[str], team_id: str
    ) -> ReplacementData:
        if not assignment_ids:
            raise ValueError("No assignment id provided")

        assignments_target = self.collection.assignment_db.get_assignments_by_ids(
            assignment_ids, raise_on_missing=True
        )

        workers = self.collection.worker_db.get_workers_not_deleted(team_id=team_id)
        shifts = self.collection.shift_db.get_shifts_not_deleted(team_id=team_id)

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

        dimensions = self.collection.dimension_db.get_dimensions(team_id=team_id)
        dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
            [dim.id for dim in dimensions]
        )
        attributes = self.collection.attribute_db.get_attributes_by_owner_ids(
            [w.id for w in workers] + [s.id for s in shifts]
        )
        specialties = self.collection.specialty_db.get_specialties_by_team_id(
            team_id=team_id
        )
        constraints = self.collection.constraint_build_db.get_constraint_builds(
            team_id=team_id
        )

        dates = [a.date for a in assignments_target]
        earliest_date = min(dates)

        # Base latest date from assignments
        raw_latest_date = max(dates)

        # Compute end of week (Sunday) for the latest date
        # Python's weekday(): Monday=0 ... Sunday=6
        end_of_week = raw_latest_date + timedelta(days=6 - raw_latest_date.weekday())

        # Compute end of month for the latest date without adding new imports
        if raw_latest_date.month == 12:
            first_of_next_month = raw_latest_date.replace(
                year=raw_latest_date.year + 1, month=1, day=1
            )
        else:
            first_of_next_month = raw_latest_date.replace(
                month=raw_latest_date.month + 1, day=1
            )
        end_of_month = first_of_next_month - timedelta(days=1)

        # Choose whichever is latest: the raw latest date, end of week, or end of month
        latest_date = max(raw_latest_date, end_of_week, end_of_month)

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

        # Fetch all requests for the workers that might overlap
        # with the date range
        worker_ids = [w.id for w in workers]
        requests = self.collection.request_db.get_requests_by_dates(
            start_date=earliest_date_minus_1_year,
            end_date=latest_date,
            worker_ids=worker_ids,
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
            requests=requests,
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

    def _filter_constraint_fil_for_assignment(
        self,
        constraint_fil: ConstraintFil,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> ConstraintFil | None:
        """Filter a ConstraintFil to only include variables containing the
        target date and shift.

        Args:
            constraint_fil: The ConstraintFil to filter
            assignment_date_iso: Assignment date in ISO format
                (e.g., "2025-01-15")
            assignment_shift_id: Assignment shift ID

        Returns:
            A new ConstraintFil with filtered constraint_variables,
            or None if no variables match.
        """
        filtered_variables = [
            var
            for var in constraint_fil.constraint_variables
            if var[1] == assignment_date_iso and var[2] == assignment_shift_id
        ]

        # If no variables match, return None
        if not filtered_variables:
            return None

        # Create a new ConstraintFil with filtered data
        return ConstraintFil(
            id=constraint_fil.id,
            constraint_type=constraint_fil.constraint_type,
            operator=constraint_fil.operator,
            target_value=constraint_fil.target_value,
            target_unit=constraint_fil.target_unit,
            active=constraint_fil.active,
            hard=constraint_fil.hard,
            priority=constraint_fil.priority,
            penalty=constraint_fil.penalty,
            schedule_id=constraint_fil.schedule_id,
            constraint_build_id=constraint_fil.constraint_build_id,
            constraint_variables=filtered_variables,
        )

    def _filter_all_constraint_fils(
        self,
        constraints: Constraints,
        assignment_date_iso: str,
        assignment_shift_id: str,
    ) -> List[ConstraintFil]:
        """Filter all ConstraintFil objects to only include those relevant
        to the assignment.

        Args:
            constraints: The Constraints object containing all constraint types
            assignment_date_iso: Assignment date in ISO format
            assignment_shift_id: Assignment shift ID

        Returns:
            A filtered list of ConstraintFil objects, excluding any that
            have no matching variables.
        """
        filtered_fils = []

        for constraint_fil in constraints.fil:
            filtered_fil = self._filter_constraint_fil_for_assignment(
                constraint_fil, assignment_date_iso, assignment_shift_id
            )
            if filtered_fil is not None:
                filtered_fils.append(filtered_fil)

        return filtered_fils

    def _compute_assignment_datetimes(
        self,
        assignment: Assignment,
        shift: Shift,
        duty_assignment: Assignment | None = None,
        duty_shift: Shift | None = None,
    ) -> tuple[datetime, datetime]:
        """Compute actual start and end datetimes for an assignment.

        For recuperation shifts the assignment is stored on the same date as the
        preceding duty, but the recuperation period only begins once the duty
        ends (which may be on the following calendar day).  When ``duty_assignment``
        and ``duty_shift`` are provided the recuperation window is anchored to the
        duty end time rather than to ``assignment.date``.

        Args:
            assignment: The assignment whose datetime window is being computed.
            shift: The shift associated with this assignment.
            duty_assignment: The duty assignment that precedes a recuperation
                assignment (``assignment.reference_assignment_id`` → this).
                Only relevant when ``shift.rest_type == ShiftRestType.RECUPERATION``.
            duty_shift: The shift object for ``duty_assignment``.  Must be
                supplied together with ``duty_assignment``.

        Returns:
            Tuple of (start_datetime, end_datetime), both UTC-aware.
        """
        # Recuperation shifts start when the preceding duty ends, not at the
        # naive combination of assignment.date + shift.start_time.
        if (
            shift.rest_type == ShiftRestType.RECUPERATION
            and duty_assignment is not None
            and duty_shift is not None
        ):
            duty_days_diff = (duty_shift.end_time - duty_shift.start_time).days
            duty_end_dt = datetime.combine(
                duty_assignment.date,
                duty_shift.end_time.time(),
                tzinfo=timezone.utc,
            ) + timedelta(days=duty_days_diff)
            recup_duration = shift.end_time - shift.start_time
            return duty_end_dt, duty_end_dt + recup_duration

        # Combine assignment date with shift start time
        start_dt = datetime.combine(
            assignment.date, shift.start_time.time(), tzinfo=timezone.utc
        )

        # Handle shifts that end on following day
        days_diff = (shift.end_time - shift.start_time).days
        end_dt = datetime.combine(
            assignment.date, shift.end_time.time(), tzinfo=timezone.utc
        ) + timedelta(days=days_diff)

        return start_dt, end_dt

    # pylint: disable=too-many-arguments
    def _build_replacement_context(
        self,
        assignment: Assignment,
        replacement_data: ReplacementData,
        constraints: Constraints,
        a_filtered_out: List[tuple[str, str, str]],
        shift_dim_dict: Dict,
    ) -> ReplacementContext:
        """Build pre-computed context for evaluating replacement candidates.

        Args:
            assignment: The target assignment to replace
            replacement_data: All fetched data for replacements
            constraints: Filtered constraints relevant to the assignment
            a_filtered_out: Filtered worker-shift filter violations
            shift_dim_dict: Pre-computed shift dimension dictionary

        Returns:
            ReplacementContext with indexed lookups for efficient evaluation
        """
        # Find the target shift
        target_shift = next(
            (s for s in replacement_data.shifts if s.id == assignment.shift_id),
            None,
        )
        if not target_shift:
            raise ValueError(f"Shift {assignment.shift_id} not found")

        # Pre-compute start and end datetimes for all assignments
        assignment_times = {}
        shift_by_id = {s.id: s for s in replacement_data.shifts}
        assignment_by_id = {a.id: a for a in replacement_data.assignments}
        for assgn in replacement_data.assignments:
            shift = shift_by_id.get(assgn.shift_id)
            if shift:
                duty_assignment = None
                duty_shift = None
                if (
                    shift.rest_type == ShiftRestType.RECUPERATION
                    and assgn.reference_assignment_id
                ):
                    duty_assignment = assignment_by_id.get(
                        assgn.reference_assignment_id
                    )
                    if duty_assignment:
                        duty_shift = shift_by_id.get(duty_assignment.shift_id)
                assignment_times[assgn.id] = self._compute_assignment_datetimes(
                    assgn, shift, duty_assignment, duty_shift
                )

        # Pre-compute augmented requests
        worker_by_id = {w.id: w for w in replacement_data.workers}
        requests_augmented = []
        for request in replacement_data.requests:
            worker = worker_by_id.get(request.worker_id)
            if worker:
                request_aug = r_to_r_augmented(
                    request=request,
                    worker=worker,
                    shifts=replacement_data.shifts,
                    dimensions=replacement_data.dimensions,
                    dim_entries=replacement_data.dim_entries,
                    attributes=replacement_data.attributes,
                )
                # Only include active requests
                if request_aug.active:
                    requests_augmented.append(request_aug)

        # Pre-compute assignment tuples for O(1) lookup
        assignment_tuples = {
            (a.worker_id, a.date.isoformat(), a.shift_id)
            for a in replacement_data.assignments
        }

        return ReplacementContext(
            target_assignment=assignment,
            target_shift=target_shift,
            assignment_date=assignment.date,
            workers=replacement_data.workers,
            shifts=replacement_data.shifts,
            constraints=constraints,
            a_filtered_out=a_filtered_out,
            assignments=replacement_data.assignments,
            requests=replacement_data.requests,
            requests_augmented=requests_augmented,
            assignment_times=assignment_times,
            dimensions=replacement_data.dimensions,
            dim_entries=replacement_data.dim_entries,
            attributes=replacement_data.attributes,
            shift_dim_dict=shift_dim_dict,
            assignment_tuples=assignment_tuples,
        )

    def _check_is_employed(self, worker: Worker, context: ReplacementContext) -> bool:
        """Check if worker is employed on the assignment date.

        Args:
            worker: The worker to check
            context: Pre-computed replacement context

        Returns:
            True if worker is employed on the assignment date
        """
        assignment_date = context.assignment_date

        # Check if started before or on assignment date
        if worker.employment_start_date > assignment_date:
            return False

        # Check if still employed (no end date or end date after assignment)
        if worker.employment_end_date is None:
            return True

        return assignment_date <= worker.employment_end_date

    def _get_staffing_requirements(
        self, shift: Shift
    ) -> tuple[bool, set[str], dict[str | None, int]]:
        """Extract and organize staffing requirements from a shift.

        Args:
            shift: The shift to analyze

        Returns:
            Tuple containing:
            - has_none_staffing: Whether shift has any None specialty slots
            - required_specialty_ids: Set of non-None specialty IDs required
            - staffing_dict: Dict mapping specialty_id -> required count
        """
        has_none_staffing = False
        required_specialty_ids = set()
        staffing_dict: dict[str | None, int] = {}

        for staffing in shift.staffing:
            specialty_id = staffing.specialty_id
            count = staffing.staffing

            # Accumulate counts for same specialty
            staffing_dict[specialty_id] = staffing_dict.get(specialty_id, 0) + count

            if specialty_id is None:
                has_none_staffing = True
            else:
                required_specialty_ids.add(specialty_id)

        return has_none_staffing, required_specialty_ids, staffing_dict

    def _count_specialty_coverage(
        self,
        shift: Shift,
        other_assignments: list[Assignment],
        worker_by_id: dict[str, Worker],
        required_specialty_ids: set[str],
    ) -> dict[str | None, int]:
        """Count how many assignments cover each specialty requirement.

        Uses greedy matching: each worker's specialties are matched to the first
        unfilled specialty requirement they possess. Multi-specialty workers can
        fill any one of their matching requirements.

        Args:
            shift: The shift with staffing requirements
            other_assignments: Existing assignments (excluding target being replaced)
            worker_by_id: Lookup dict for worker objects
            required_specialty_ids: Set of non-None specialty IDs required

        Returns:
            Dict mapping specialty_id (or None) -> count of assignments covering it
        """
        # Initialize coverage counts
        coverage: dict[str | None, int] = {}
        for staffing in shift.staffing:
            coverage[staffing.specialty_id] = 0

        # Track which assignments we've already counted
        counted_assignment_ids = set()

        # First pass: count specialty assignments (greedy matching)
        for specialty_id in required_specialty_ids:
            required_count = sum(
                s.staffing for s in shift.staffing if s.specialty_id == specialty_id
            )

            for assignment in other_assignments:
                if assignment.id in counted_assignment_ids:
                    continue
                if coverage[specialty_id] >= required_count:
                    break

                worker = worker_by_id.get(assignment.worker_id)
                if worker and specialty_id in worker.specialty_ids:
                    coverage[specialty_id] += 1
                    counted_assignment_ids.add(assignment.id)

        # Second pass: count None specialty assignments (workers with no
        # required specialties)
        if None in coverage:
            required_none_count = sum(
                s.staffing for s in shift.staffing if s.specialty_id is None
            )

            for assignment in other_assignments:
                if assignment.id in counted_assignment_ids:
                    continue
                if coverage[None] >= required_none_count:
                    break

                worker = worker_by_id.get(assignment.worker_id)
                if worker:
                    # Worker qualifies for None slot if they have no required
                    # specialties
                    worker_has_required_specialty = any(
                        spec_id in worker.specialty_ids
                        for spec_id in required_specialty_ids
                    )
                    if not worker_has_required_specialty:
                        coverage[None] += 1
                        counted_assignment_ids.add(assignment.id)

        return coverage

    # pylint: disable=too-many-return-statements
    def _check_has_specialty(self, worker: Worker, context: ReplacementContext) -> bool:
        """Check if worker has required specialty for the shift.

        Handles multi-specialty staffing with proper counting. For shifts requiring
        multiple workers per specialty (e.g., 2 surgeons + 1 nurse), this method
        counts existing assignments per specialty and determines if the worker can
        fill an unmet requirement.

        Examples:
        - Shift needs 2 surgeons, 1 assigned -> candidate must be surgeon
        - Shift needs 1 surgeon + 1 nurse, 1 surgeon assigned -> candidate must be nurse
        - Shift needs 2 None + 1 surgeon, 2 non-surgeons assigned -> candidate
        must be surgeon
        - Multi-specialty worker (surgeon+nurse) can fill any unmet requirement

        Args:
            worker: The worker to check
            context: Pre-computed replacement context

        Returns:
            True if worker has appropriate specialty to maintain shift staffing
        """
        target_shift = context.target_shift
        assignment_date = context.assignment_date

        if not target_shift.staffing:
            # No staffing requirements means any worker qualifies
            return True

        # Extract staffing requirements
        has_none_staffing, required_specialty_ids, staffing_dict = (
            self._get_staffing_requirements(target_shift)
        )

        # Case A: No specialty requirements at all (all None) - any worker qualifies
        if not required_specialty_ids and has_none_staffing:
            return True

        # Case B: No staffing with none specialties, and worker has no
        # specialties of the ones required
        if (
            not has_none_staffing
            and not set(worker.specialty_ids) & required_specialty_ids
        ):
            return False

        # Find other assignments for the same shift on the same date
        # (excluding the target assignment being replaced)
        other_assignments = [
            a
            for a in context.assignments
            if (
                a.shift_id == target_shift.id
                and a.date == assignment_date
                and a.id != context.target_assignment.id
            )
        ]

        # Case C: No other assignments exist - accept worker if they have any required
        # specialty OR qualify for None slot
        if not other_assignments:
            worker_specialty_set = set(worker.specialty_ids)
            required_specialty_set = set(required_specialty_ids)

            # Worker qualifies if they have any required specialty
            if worker_specialty_set & required_specialty_set:
                return True

            # OR if shift has None slots and worker has no required specialties
            if has_none_staffing:
                worker_has_required_specialty = bool(
                    worker_specialty_set & required_specialty_set
                )
                if not worker_has_required_specialty:
                    return True

            # If shift only has specialty requirements (no None) and worker
            # doesn't have any
            if not has_none_staffing:
                return False

            return True

        # Case D: Other assignments exist - count coverage and check if worker fills gap
        worker_by_id = {w.id: w for w in context.workers}

        # Count current specialty coverage
        coverage = self._count_specialty_coverage(
            target_shift,
            other_assignments,
            worker_by_id,
            required_specialty_ids,
        )

        # Determine which requirements are not yet met
        unmet_requirements: list[str | None] = []
        for specialty_id, required_count in staffing_dict.items():
            if coverage.get(specialty_id, 0) < required_count:
                unmet_requirements.append(specialty_id)

        # If all requirements met (possibly overstaffed), any worker is acceptable
        if not unmet_requirements:
            return True

        # Check if worker can fill any unmet requirement
        worker_specialty_set = set(worker.specialty_ids)

        for unmet_specialty_id in unmet_requirements:
            if unmet_specialty_id is None:
                # None slot: worker qualifies if they have no required specialties
                worker_has_required_specialty = bool(
                    worker_specialty_set & required_specialty_ids
                )
                if not worker_has_required_specialty:
                    return True
            else:
                # Specialty slot: worker qualifies if they have this specialty
                if unmet_specialty_id in worker.specialty_ids:
                    return True

        # Worker doesn't fill any unmet requirement
        return False

    def _check_isnt_on_leave(self, worker: Worker, context: ReplacementContext) -> bool:
        """Check if worker is NOT on leave on the assignment date.

        Only approved leave requests that overlap with the target shift
        cause this check to fail. The leave shift must time-overlap with
        the target shift being replaced.

        Args:
            worker: The worker to check
            context: Pre-computed replacement context

        Returns:
            True if worker does NOT have an approved leave request
            that overlaps with the target shift
        """
        assignment_date = context.assignment_date
        target_shift = context.target_shift

        # Build shift lookup dictionary
        shift_by_id = {s.id: s for s in context.shifts}

        # Check if worker has any approved leave request covering the date
        for request in context.requests:
            if (
                request.worker_id == worker.id
                and request.request_type == RequestType.LEAVE
                and request.status == RequestStatus.APPROVED
                and request.start_date <= assignment_date <= request.end_date
            ):
                # Get the leave shift
                if not request.shift_id:
                    # If no shift specified, assume it conflicts (conservative)
                    return False
                leave_shift = shift_by_id.get(request.shift_id)
                if not leave_shift:
                    # If leave shift not found, assume it conflicts (conservative)
                    return False

                # Check if leave shift overlaps with target shift
                if target_shift.overlaps_with(leave_shift):
                    return False  # Worker is on leave during target shift

        return True  # Worker is not on leave or leave doesn't overlap

    def _check_overlap_hits(
        self, worker: Worker, context: ReplacementContext
    ) -> OverlapHits:
        """Check if worker has overlapping assignments with target shift.

        Args:
            worker: The worker to check
            context: Pre-computed replacement context

        Returns:
            OverlapHits with hasnt_overlap=False if overlaps exist,
            and list of overlapping assignment IDs
        """
        overlap_assignment_ids = []

        # Get target assignment times
        target_times = context.assignment_times.get(context.target_assignment.id)
        if not target_times:
            # If target times not found, cannot check overlap
            return OverlapHits(hasnt_overlap=True, overlap_assignment_ids=[])

        target_start, target_end = target_times

        # Check all worker assignments for time overlap
        for assignment in context.assignments:
            # Skip if not this worker
            if assignment.worker_id != worker.id:
                continue

            # Skip if it's the target assignment itself
            if assignment.id == context.target_assignment.id:
                continue

            # Get assignment times
            assgn_times = context.assignment_times.get(assignment.id)
            if not assgn_times:
                continue

            assgn_start, assgn_end = assgn_times

            # Check if time ranges overlap
            # Two ranges overlap if: start1 < end2 AND end1 > start2
            if target_start < assgn_end and target_end > assgn_start:
                overlap_assignment_ids.append(assignment.id)

        return OverlapHits(
            hasnt_overlap=len(overlap_assignment_ids) == 0,
            overlap_assignment_ids=overlap_assignment_ids,
        )

    def _check_request_hits(
        self, worker: Worker, context: ReplacementContext
    ) -> RequestHits:
        """Check if worker has request conflicts with target assignment.

        Args:
            worker: The worker to check
            context: Pre-computed replacement context

        Returns:
            RequestHits with has_no_request_conflict=False if conflicts exist,
            and list of conflicting request IDs
        """
        assignment_date = context.assignment_date
        conflicting_request_ids = []

        # Check all work demand requests for this worker
        for request_aug in context.requests_augmented:
            # Filter for this worker's approved work demand requests
            if (
                request_aug.worker_id != worker.id
                or request_aug.request_type != RequestType.WORK_DEMAND
                or request_aug.status != RequestStatus.APPROVED
            ):
                continue

            # Check if request covers the assignment date
            if not request_aug.start_date <= assignment_date <= request_aug.end_date:
                continue

            # Get the list of shift IDs for this request
            shift_ids = parse_selected_shifts(
                selected_shifts=request_aug.shift_options,
                missing_properties=request_aug.missing_attributes,
                shifts=context.shifts,
                shift_dim_dict=context.shift_dim_dict,
            )

            # Check for conflict based on request type
            target_shift_in_list = context.target_shift.id in shift_ids
            is_conflict = False

            if request_aug.negative:
                # Negative request: worker doesn't want these shifts
                # Conflict if target shift is in the list
                is_conflict = target_shift_in_list
            else:
                # Positive request: worker wants these specific shifts
                # Logic:
                # - If only one requested shift: conflict if it overlaps with target
                # - If multiple requested shifts: conflict if ALL overlap with target
                requested_shifts = [s for s in context.shifts if s.id in shift_ids]

                # Multiple shifts: conflict if ALL overlap with target
                is_conflict = (
                    all(s.overlaps_with(context.target_shift) for s in requested_shifts)
                    and not target_shift_in_list
                )

            if is_conflict:
                conflicting_request_ids.append(request_aug.id)

        return RequestHits(
            has_no_request_conflict=len(conflicting_request_ids) == 0,
            conflicting_request_ids=conflicting_request_ids,
        )

    def _check_filter_hits(
        self, worker: Worker, context: ReplacementContext
    ) -> FilterHits:
        """Check if worker-shift-date combination is filtered out.

        Args:
            worker: The worker to check
            context: Pre-computed replacement context

        Returns:
            FilterHits indicating if the combination is allowed
        """
        # Build the tuple for this worker-shift-date combination
        assignment_tuple = (
            worker.id,
            context.assignment_date.isoformat(),
            context.target_shift.id,
        )

        # Check if this combination is in the filtered-out list
        isnt_filtered = assignment_tuple not in context.a_filtered_out

        # TO COME: Determine specific filter labels
        # (dimension mismatch, bool policy, no duties, etc.)
        # For now, provide generic label if filtered
        filter_labels = [] if isnt_filtered else ["worker_shift_filter"]

        return FilterHits(
            isnt_filtered_out=isnt_filtered,
            filter_labels=filter_labels,
        )

    def _create_hypothetical_assignment(
        self, worker: Worker, context: ReplacementContext
    ) -> Assignment:
        """Create a hypothetical assignment for constraint checking.

        Args:
            worker: The candidate worker
            context: Pre-computed replacement context

        Returns:
            Assignment object with candidate worker replacing target assignment
        """
        return Assignment(
            id="",
            team_id=context.target_assignment.team_id,
            schedule_id=context.target_assignment.schedule_id,
            worker_id=worker.id,
            date=context.target_assignment.date,
            shift_id=context.target_assignment.shift_id,
            fixed=False,
            source=AssignmentSource.SOLVER,
        )

    # pylint: disable=too-many-branches
    def _check_constraint_sum_hits(
        self, worker: Worker, context: ReplacementContext, hard: bool
    ) -> ConstraintHits:
        """Check ConstraintSum violations for replacement.

        Args:
            worker: The candidate worker
            context: Pre-computed replacement context
            hard: True to check hard constraints, False for soft

        Returns:
            ConstraintHits with meets_constraints flag and breaches
        """
        breaches: List[Breach] = []
        candidate_tuple = (
            worker.id,
            context.target_assignment.date.isoformat(),
            context.target_assignment.shift_id,
        )

        # Filter constraints by hardness
        relevant_constraints = [c for c in context.constraints.sum if c.hard == hard]

        for constraint in relevant_constraints:
            # For each period in the constraint
            for period_idx, period_vars in enumerate(constraint.constraint_variables):
                # Check if this period contains the target assignment
                period_tuples = set(period_vars)
                if candidate_tuple not in period_tuples:
                    continue

                # Count assignments with candidate replacing target
                # Count existing assignments minus target plus candidate
                count = 0
                breach_variables: List[Variable] = []

                for var_tuple in period_tuples:
                    # Check if this assignment exists
                    if (
                        var_tuple in context.assignment_tuples
                        or var_tuple == candidate_tuple
                    ):
                        count += 1
                        # Add to breach variables for this period
                        breach_variables.append(
                            Variable(
                                worker_id=var_tuple[0],
                                date=datetime.fromisoformat(var_tuple[1]).date(),
                                shift_id=var_tuple[2],
                            )
                        )

                # Get target value for this period
                target_value = constraint.target_values[period_idx]

                # Calculate deviation based on operator
                deviation = 0
                if constraint.operator is None:
                    deviation = abs(target_value - count)
                elif constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    deviation = max(count - target_value, 0)
                elif constraint.operator == ConstraintOperator.EQUAL:
                    deviation = abs(target_value - count)
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    deviation = max(target_value - count, 0)
                elif constraint.operator == ConstraintOperator.LESS_THAN:
                    deviation = max(count - target_value + 1, 0)
                elif constraint.operator == ConstraintOperator.GREATER_THAN:
                    deviation = max(target_value - count + 1, 0)

                # If there's a deviation, create a breach
                if deviation > 0:
                    breach = Breach(
                        id="",
                        schedule_id=(context.target_assignment.schedule_id or ""),
                        objective_id=constraint.id,
                        objective_category=ObjectiveCategory.CONSTRAINT,
                        variables=breach_variables,
                        description="",
                        hard_to_soft=None,
                        meta=None,
                    )
                    breaches.append(breach)

        return ConstraintHits(
            meets_constraints=len(breaches) == 0,
            breaches=breaches,
        )

    # pylint: disable=too-many-nested-blocks
    def _check_constraint_seq_hits(
        self, worker: Worker, context: ReplacementContext, hard: bool
    ) -> ConstraintHits:
        """Check ConstraintSeq violations for replacement.

        ConstraintSeq checks for consecutive assignments:
        - LESS_THAN_OR_EQUAL: penalizes sequences longer than target
        - GREATER_THAN_OR_EQUAL: penalizes bounded sequences shorter
        - EQUAL: combines both checks

        Args:
            worker: The candidate worker
            context: Pre-computed replacement context
            hard: True to check hard constraints, False for soft

        Returns:
            ConstraintHits with meets_constraints flag and breaches
        """
        breaches: List[Breach] = []
        candidate_tuple = (
            worker.id,
            context.target_assignment.date.isoformat(),
            context.target_assignment.shift_id,
        )

        # Filter constraints by hardness
        relevant_constraints = [c for c in context.constraints.seq if c.hard == hard]

        for constraint in relevant_constraints:
            # For each period in the constraint
            for period_vars in constraint.constraint_variables:
                # Check if this period contains the target assignment
                period_tuples = set(period_vars)
                if candidate_tuple not in period_tuples:
                    continue

                # Build boolean array aligned with period_vars positions
                # True if assignment exists (including candidate replacement)
                assignments_exist = [
                    (
                        var_tuple in context.assignment_tuples
                        or var_tuple == candidate_tuple
                    )
                    for var_tuple in period_vars
                ]

                # Extract all consecutive runs using run-length encoding
                # Each run: (start_index, length)
                runs: List[tuple[int, int]] = []
                current_start = None
                current_length = 0

                for i, exists in enumerate(assignments_exist):
                    if exists:
                        if current_start is None:
                            current_start = i
                            current_length = 1
                        else:
                            current_length += 1
                    else:
                        if current_start is not None:
                            runs.append((current_start, current_length))
                            current_start = None
                            current_length = 0

                # Don't forget last run if it extends to end
                if current_start is not None:
                    runs.append((current_start, current_length))

                # Check each run for violations
                violation_found = False
                breach_variables: List[Variable] = []

                for start_idx, run_length in runs:
                    run_violates = False

                    # Check LESS_THAN_OR_EQUAL: run too long
                    if constraint.operator in [
                        ConstraintOperator.LESS_THAN_OR_EQUAL,
                        ConstraintOperator.EQUAL,
                    ]:
                        if run_length > constraint.target_value:
                            run_violates = True

                    # Check GREATER_THAN_OR_EQUAL: bounded run too short
                    if constraint.operator in [
                        ConstraintOperator.GREATER_THAN_OR_EQUAL,
                        ConstraintOperator.EQUAL,
                    ]:
                        if run_length < constraint.target_value:
                            # Check if run is bounded (has gaps before/after)
                            has_gap_before = (
                                start_idx == 0 or not assignments_exist[start_idx - 1]
                            )
                            has_gap_after = (
                                start_idx + run_length >= len(assignments_exist)
                                or not assignments_exist[start_idx + run_length]
                            )

                            if has_gap_before and has_gap_after:
                                run_violates = True

                    # Collect breach variables for this violating run
                    if run_violates:
                        violation_found = True
                        for offset in range(run_length):
                            var_tuple = period_vars[start_idx + offset]
                            # Only include existing assignments in breach
                            if var_tuple in context.assignment_tuples:
                                breach_variables.append(
                                    Variable(
                                        worker_id=var_tuple[0],
                                        date=datetime.fromisoformat(
                                            var_tuple[1]
                                        ).date(),
                                        shift_id=var_tuple[2],
                                    )
                                )
                        # Break after finding first violation
                        break

                # Create breach if violation found
                if violation_found and breach_variables:
                    breach = Breach(
                        id="",
                        schedule_id=(context.target_assignment.schedule_id or ""),
                        objective_id=constraint.id,
                        objective_category=ObjectiveCategory.CONSTRAINT,
                        variables=breach_variables,
                        description="",
                        hard_to_soft=None,
                        meta=None,
                    )
                    breaches.append(breach)

        return ConstraintHits(
            meets_constraints=len(breaches) == 0,
            breaches=breaches,
        )

    def _check_constraint_ord_hits(
        self, worker: Worker, context: ReplacementContext, hard: bool
    ) -> ConstraintHits:
        """Check ConstraintOrd violations for replacement.

        ConstraintOrd checks ordering between assignment pairs:
        - YES operator: if ref exists, rel must exist
        - NO operator: if ref exists, rel must NOT exist

        Args:
            worker: The candidate worker
            context: Pre-computed replacement context
            hard: True to check hard constraints, False for soft

        Returns:
            ConstraintHits with meets_constraints flag and breaches
        """
        breaches: List[Breach] = []
        candidate_tuple = (
            worker.id,
            context.target_assignment.date.isoformat(),
            context.target_assignment.shift_id,
        )

        # Filter constraints by hardness
        relevant_constraints = [c for c in context.constraints.ord if c.hard == hard]

        for constraint in relevant_constraints:
            # For each pair of (reference, relative) assignments
            for ref_tuple, rel_tuple in constraint.constraint_variables:
                # Check if target assignment is in this pair
                if candidate_tuple not in (ref_tuple, rel_tuple):
                    continue

                # Check if assignments exist
                ref_exists = (
                    ref_tuple in context.assignment_tuples
                    or ref_tuple == candidate_tuple
                )
                rel_exists = (
                    rel_tuple in context.assignment_tuples
                    or rel_tuple == candidate_tuple
                )

                # Check for violations based on operator
                violation_found = False
                breach_variables: List[Variable] = []

                if constraint.operator == ConstraintOperator.YES:
                    # If ref exists, rel must exist
                    if ref_exists and not rel_exists:
                        violation_found = True
                elif constraint.operator == ConstraintOperator.NO:
                    # If ref exists, rel must NOT exist
                    if ref_exists and rel_exists:
                        violation_found = True

                # Create breach if violation found
                if violation_found:
                    # Include both reference and relative in breach vars
                    if ref_exists:
                        breach_variables.append(
                            Variable(
                                worker_id=ref_tuple[0],
                                date=datetime.fromisoformat(ref_tuple[1]).date(),
                                shift_id=ref_tuple[2],
                            )
                        )
                    if rel_exists:
                        breach_variables.append(
                            Variable(
                                worker_id=rel_tuple[0],
                                date=datetime.fromisoformat(rel_tuple[1]).date(),
                                shift_id=rel_tuple[2],
                            )
                        )

                    breach = Breach(
                        id="",
                        schedule_id=(context.target_assignment.schedule_id or ""),
                        objective_id=constraint.id,
                        objective_category=ObjectiveCategory.CONSTRAINT,
                        variables=breach_variables,
                        description="",
                        hard_to_soft=None,
                        meta=None,
                    )
                    breaches.append(breach)

        return ConstraintHits(
            meets_constraints=len(breaches) == 0,
            breaches=breaches,
        )

    def _check_constraint_fil_hits(
        self, worker: Worker, context: ReplacementContext, hard: bool
    ) -> ConstraintHits:
        """Check if the worker replacement would violate any ConstraintFil.

        ConstraintFil specifies forbidden assignments. We check if assigning
        the candidate worker to the target shift on the target date would
        create a forbidden assignment.

        Args:
            worker: The candidate worker
            context: Pre-computed replacement context
            hard: If True, check hard constraints; if False, check soft

        Returns:
            ConstraintHits with meets_constraints flag and list of breaches
        """
        breaches = []

        # Filter constraints by hardness
        relevant_constraints = [c for c in context.constraints.fil if c.hard == hard]

        # Create the candidate tuple
        candidate_tuple = (
            worker.id,
            context.assignment_date.isoformat(),
            context.target_assignment.shift_id,
        )

        # Check each constraint
        for constraint in relevant_constraints:
            # Check if the candidate tuple is in the forbidden list
            if candidate_tuple in constraint.constraint_variables:
                # This is a breach - candidate would create a forbidden assignment
                breach_variable = Variable(
                    worker_id=worker.id,
                    date=context.assignment_date,
                    shift_id=context.target_assignment.shift_id,
                )

                breach = Breach(
                    id="",
                    schedule_id=context.target_assignment.schedule_id or "",
                    objective_id=constraint.id,
                    objective_category=ObjectiveCategory.CONSTRAINT,
                    variables=[breach_variable],
                    description="",
                    hard_to_soft=None,
                )
                breaches.append(breach)

        return ConstraintHits(
            meets_constraints=len(breaches) == 0,
            breaches=breaches,
        )

    def _check_constraint_fai_hits(
        self, _worker: Worker, _context: ReplacementContext, _hard: bool
    ) -> ConstraintHits:
        """Check ConstraintFai violations for replacement.

        TO COME: Implement ConstraintFai checking following ConstraintSum pattern.

        Args:
            _worker: The candidate worker
            _context: Pre-computed replacement context
            _hard: True to check hard constraints, False for soft

        Returns:
            ConstraintHits with meets_constraints flag and breaches
        """
        return ConstraintHits(meets_constraints=True, breaches=[])

    def _calculate_new_monthly_duties(
        self, worker: Worker, context: ReplacementContext
    ) -> MonthlyDutiesImplications:
        """Calculate the number of duty shifts the worker would have in
        the target month if the replacement takes place.

        Args:
            worker: The worker to evaluate
            context: Pre-computed replacement context

        Returns:
            MonthlyDutiesImplications with count and delta
        """
        target_year = context.assignment_date.year
        target_month = context.assignment_date.month

        # Create a shift_id to shift lookup
        shift_lookup = {s.id: s for s in context.shifts}

        # Count existing duty assignments in the target month
        duty_count = 0
        for assignment in context.assignments:
            if (
                assignment.worker_id == worker.id
                and assignment.date.year == target_year
                and assignment.date.month == target_month
                and assignment.date != context.assignment_date
            ):
                shift = shift_lookup.get(assignment.shift_id)
                if shift and shift.shift_type == ShiftType.DUTY:
                    duty_count += 1

        # Add 1 if the target shift is also a duty
        if context.target_shift.shift_type == ShiftType.DUTY:
            duty_count += 1

        delta = duty_count - worker.duties_per_month
        meets_target = duty_count <= worker.duties_per_month

        return MonthlyDutiesImplications(
            new_number_monthly_duties=duty_count,
            new_monthly_duties_delta=delta,
            meets_target=meets_target,
        )

    def _calculate_new_weekly_time(
        self, worker: Worker, context: ReplacementContext
    ) -> WeeklyWorkTimeImplications:
        """Calculate the total minutes worked by the worker in the week of
        the target assignment if the replacement takes place.

        Args:
            worker: The worker to evaluate
            context: Pre-computed replacement context

        Returns:
            WeeklyWorkTimeImplications with minutes and delta
        """
        # Build weekly periods to find which week contains the target date
        # Use a date range around the target date
        start_date = context.assignment_date - timedelta(days=7)
        end_date = context.assignment_date + timedelta(days=7)
        dates_list = build_dates_list(start_date, end_date)

        periods_weekly = build_periods_weekly([], dates_list)

        # Find the period containing the target date
        target_period = None
        for period in periods_weekly:
            if context.assignment_date in period:
                target_period = period
                break

        if not target_period:
            # Fallback: shouldn't happen, but return zero if we can't find the week
            return WeeklyWorkTimeImplications(
                new_weekly_worked_minutes=0,
                new_weekly_time_delta_minutes=-(worker.weekly_hours * 60),
                meets_target=True,
            )

        # Create a shift lookup
        shift_lookup = {s.id: s for s in context.shifts}

        # Calculate total worked minutes in the target week
        total_minutes = 0
        for assignment in context.assignments:
            if (
                assignment.worker_id == worker.id
                and assignment.date in target_period
                and assignment.date != context.assignment_date
            ):
                shift = shift_lookup.get(assignment.shift_id)
                if shift and shift.shift_type in [
                    ShiftType.NORMAL,
                    ShiftType.DUTY,
                ]:
                    duration = shift.end_time - shift.start_time
                    total_minutes += int(duration.total_seconds() / 60)

        # Add the target shift's duration
        target_duration = (
            context.target_shift.end_time - context.target_shift.start_time
        )
        total_minutes += int(target_duration.total_seconds() / 60)

        # Calculate delta (weekly_hours is in hours, convert to minutes)
        expected_minutes = worker.weekly_hours * 60
        delta = total_minutes - expected_minutes
        meets_target = total_minutes <= expected_minutes

        return WeeklyWorkTimeImplications(
            new_weekly_worked_minutes=total_minutes,
            new_weekly_time_delta_minutes=delta,
            meets_target=meets_target,
        )

    def _calculate_nb_times_did_shift_ltm(
        self, worker: Worker, context: ReplacementContext
    ) -> LTMIndicator:
        """Count how many times the worker did the specific shift in the
        past 12 months, including the hypothetical replacement.

        LTM = Last Twelve Months

        Args:
            worker: The worker to evaluate
            context: Pre-computed replacement context

        Returns:
            LTMIndicator with count and last_date
        """
        # Define 12-month lookback period
        lookback_start = context.assignment_date - timedelta(days=365)
        lookback_end = context.assignment_date

        # Filter assignments for this worker and shift in the lookback period
        matching_assignments = [
            a
            for a in context.assignments
            if a.worker_id == worker.id
            and a.shift_id == context.target_shift.id
            and lookback_start <= a.date < lookback_end
        ]

        # Sort by date to find the last occurrence
        matching_assignments.sort(key=lambda a: a.date)

        # Find last date (most recent before target date)
        last_date = None
        if matching_assignments:
            last_assignment = matching_assignments[-1]
            last_date = datetime.combine(
                last_assignment.date, time.min, tzinfo=timezone.utc
            )

        # Count includes the hypothetical assignment
        count = len(matching_assignments) + 1

        return LTMIndicator(count=count, last_date=last_date)

    def _calculate_nb_times_worked_weekday_ltm(
        self, worker: Worker, context: ReplacementContext
    ) -> LTMIndicator:
        """Count how many times the worker worked on the same weekday
        in the past 12 months, including the hypothetical replacement.

        LTM = Last Twelve Months

        Args:
            worker: The worker to evaluate
            context: Pre-computed replacement context

        Returns:
            LTMIndicator with count and last_date
        """
        # Define 12-month lookback period
        lookback_start = context.assignment_date - timedelta(days=365)
        lookback_end = context.assignment_date

        # Get target weekday (0=Monday, 6=Sunday)
        target_weekday = context.assignment_date.weekday()

        # Create a shift lookup
        shift_lookup = {s.id: s for s in context.shifts}

        # Filter assignments for this worker on the same weekday
        matching_assignments = []
        for a in context.assignments:
            if (
                a.worker_id == worker.id
                and a.date.weekday() == target_weekday
                and lookback_start <= a.date < lookback_end
            ):
                shift = shift_lookup.get(a.shift_id)
                # Only count actual work shifts (exclude rest/leave)
                if shift and shift.shift_type in [
                    ShiftType.NORMAL,
                    ShiftType.DUTY,
                ]:
                    matching_assignments.append(a)

        # Sort by date to find the last occurrence
        matching_assignments.sort(key=lambda a: a.date)

        # Find last date (most recent before target date)
        last_date = None
        if matching_assignments:
            last_assignment = matching_assignments[-1]
            last_date = datetime.combine(
                last_assignment.date, time.min, tzinfo=timezone.utc
            )

        # Count includes the hypothetical assignment if it's a work shift
        count = len(matching_assignments)
        if context.target_shift.shift_type in [
            ShiftType.NORMAL,
            ShiftType.DUTY,
        ]:
            count += 1

        return LTMIndicator(count=count, last_date=last_date)

    def _build_replacement_implications(
        self, worker: Worker, context: ReplacementContext
    ) -> ReplacementImplications:
        """Build ReplacementImplications for a worker.

        Args:
            worker: The worker to evaluate
            context: Pre-computed replacement context

        Returns:
            ReplacementImplications with all checks performed
        """
        # Can't do checks
        is_employed = self._check_is_employed(worker, context)
        has_specialty = self._check_has_specialty(worker, context)
        isnt_on_leave = self._check_isnt_on_leave(worker, context)
        overlap_hits = self._check_overlap_hits(worker, context)
        request_hits = self._check_request_hits(worker, context)
        filter_hits = self._check_filter_hits(worker, context)

        # Constraint checks - combine sum, seq, and ord constraints
        hard_sum_hits = self._check_constraint_sum_hits(worker, context, hard=True)
        hard_seq_hits = self._check_constraint_seq_hits(worker, context, hard=True)
        hard_ord_hits = self._check_constraint_ord_hits(worker, context, hard=True)
        hard_fil_hits = self._check_constraint_fil_hits(worker, context, hard=True)
        hard_constraint_hits = ConstraintHits(
            meets_constraints=(
                hard_sum_hits.meets_constraints
                and hard_seq_hits.meets_constraints
                and hard_ord_hits.meets_constraints
                and hard_fil_hits.meets_constraints
            ),
            breaches=(
                hard_sum_hits.breaches
                + hard_seq_hits.breaches
                + hard_ord_hits.breaches
                + hard_fil_hits.breaches
            ),
        )

        soft_sum_hits = self._check_constraint_sum_hits(worker, context, hard=False)
        soft_seq_hits = self._check_constraint_seq_hits(worker, context, hard=False)
        soft_ord_hits = self._check_constraint_ord_hits(worker, context, hard=False)
        soft_fil_hits = self._check_constraint_fil_hits(worker, context, hard=False)
        soft_constraint_hits = ConstraintHits(
            meets_constraints=(
                soft_sum_hits.meets_constraints
                and soft_seq_hits.meets_constraints
                and soft_ord_hits.meets_constraints
                and soft_fil_hits.meets_constraints
            ),
            breaches=(
                soft_sum_hits.breaches
                + soft_seq_hits.breaches
                + soft_ord_hits.breaches
                + soft_fil_hits.breaches
            ),
        )

        # Calculate monthly duties and weekly time implications
        new_monthly_duties = self._calculate_new_monthly_duties(worker, context)
        new_weekly_time = self._calculate_new_weekly_time(worker, context)

        # Calculate LTM indicators
        nb_times_did_shift_ltm = self._calculate_nb_times_did_shift_ltm(worker, context)
        nb_times_worked_weekday_ltm = self._calculate_nb_times_worked_weekday_ltm(
            worker, context
        )

        return ReplacementImplications(
            is_employed=is_employed,
            has_specialty=has_specialty,
            isnt_on_leave=isnt_on_leave,
            filter_hits=filter_hits,
            overlap_hits=overlap_hits,
            hard_constraint_hits=hard_constraint_hits,
            request_hits=request_hits,
            soft_constraint_hits=soft_constraint_hits,
            new_monthly_duties=new_monthly_duties,
            new_weekly_time=new_weekly_time,
            nb_times_did_shift_ltm=nb_times_did_shift_ltm,
            nb_times_worked_weekday_ltm=nb_times_worked_weekday_ltm,
        )

    def _determine_replacement_category(
        self, implications: ReplacementImplications
    ) -> ReplacementCategory:
        """Determine the replacement category based on implications.

        Categorization logic:
        - CANT_DO: Worker cannot perform the replacement due to hard constraints
        - COULD_DO: Worker can perform replacement but violates soft constraints
        - CAN_DO: Worker can perform replacement without violations

        Args:
            implications: Pre-computed replacement implications

        Returns:
            ReplacementCategory (CANT_DO, COULD_DO, or CAN_DO)
        """
        # Check CANT_DO conditions - any hard blocker
        cant_do_conditions = [
            not implications.is_employed,
            not implications.has_specialty,
            not implications.isnt_on_leave,
            not implications.filter_hits.isnt_filtered_out,
            not implications.overlap_hits.hasnt_overlap,
            not implications.hard_constraint_hits.meets_constraints,
            not implications.request_hits.has_no_request_conflict,
        ]

        if any(cant_do_conditions):
            return ReplacementCategory.CANT_DO

        # Check COULD_DO conditions - soft constraint violations
        could_do_conditions = [
            not implications.soft_constraint_hits.meets_constraints,
            not implications.new_monthly_duties.meets_target,
            not implications.new_weekly_time.meets_target,
        ]

        if any(could_do_conditions):
            return ReplacementCategory.COULD_DO

        # No violations - worker can do the replacement
        return ReplacementCategory.CAN_DO

    def _calculate_ranking_key(
        self, implications: ReplacementImplications
    ) -> tuple[int, int, int]:
        """Calculate a sorting key for ranking replacement candidates.

        The key is a tuple (priority_level, weekly_delta, monthly_delta) where:
        - priority_level: 0 (best) to 10 (worst) based on constraint violations
        - weekly_delta: new_weekly_time_delta_minutes (lower is better)
        - monthly_delta: new_monthly_duties_delta (lower is better)

        Priority levels from worst (10) to best (0):
        10: not employed
        9: lacks specialty
        8: on leave
        7: filtered out by worker-shift filters
        6: has overlapping assignments
        5: violates hard constraints
        4: has request conflicts
        3: violates soft constraints
        2: exceeds monthly duties target
        1: exceeds weekly time target
        0: no violations (best)

        Args:
            implications: Pre-computed replacement implications

        Returns:
            Tuple for sorting (lower values rank better)
        """
        # Determine priority level based on violations (worst to best)
        if not implications.is_employed:
            priority = 10
        elif not implications.has_specialty:
            priority = 9
        elif not implications.isnt_on_leave:
            priority = 8
        elif not implications.filter_hits.isnt_filtered_out:
            priority = 7
        elif not implications.overlap_hits.hasnt_overlap:
            priority = 6
        elif not implications.hard_constraint_hits.meets_constraints:
            priority = 5
        elif not implications.request_hits.has_no_request_conflict:
            priority = 4
        elif not implications.soft_constraint_hits.meets_constraints:
            priority = 3
        elif not implications.new_monthly_duties.meets_target:
            priority = 2
        elif not implications.new_weekly_time.meets_target:
            priority = 1
        else:
            priority = 0

        # Tie-breakers: use actual delta values (negative = under target = better)
        weekly_delta = implications.new_weekly_time.new_weekly_time_delta_minutes
        monthly_delta = implications.new_monthly_duties.new_monthly_duties_delta

        return (priority, weekly_delta, monthly_delta)

    def _rank_candidates(
        self,
        candidates: List[ReplacementCandidate],
        current_worker_id: str,
    ) -> List[ReplacementCandidate]:
        """Rank replacement candidates based on their implications.

        The current worker (doing the target assignment) receives rank 0.
        Other candidates are ranked 1 (best replacement) to n-1 (worst).

        Ranking is determined by:
        1. Priority level (0=best to 10=worst) based on constraint violations
        2. Weekly time delta (lower is better)
        3. Monthly duties delta (lower is better)

        Args:
            candidates: List of candidates to rank
            current_worker_id: Worker ID of the current assignment holder

        Returns:
            List of candidates with assigned ranks, sorted by rank
        """
        # Separate current worker from replacement candidates
        current_worker_candidates = [
            c for c in candidates if c.worker_id == current_worker_id
        ]
        replacement_candidates = [
            c for c in candidates if c.worker_id != current_worker_id
        ]

        # Assign rank 0 to current worker
        for candidate in current_worker_candidates:
            candidate.rank = 0

        # Sort replacement candidates by ranking key
        replacement_candidates.sort(
            key=lambda c: self._calculate_ranking_key(c.replacement_implications)
        )

        # Assign ranks 1 to n-1
        for idx, candidate in enumerate(replacement_candidates, start=1):
            candidate.rank = idx

        # Combine and sort all candidates by rank
        all_candidates = current_worker_candidates + replacement_candidates
        all_candidates.sort(key=lambda c: c.rank)

        return all_candidates

    def _process_replacement_data(
        self, assignment: Assignment, replacement_data: ReplacementData
    ) -> tuple[Constraints, List[tuple[str, str, str]], Dict]:
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
            a_date_minus_1_year = assignment.date.replace(year=assignment.date.year - 1)
        except ValueError:
            # Handles Feb 29 -> fallback to Feb 28 on non-leap year
            a_date_minus_1_year = assignment.date.replace(
                month=2, day=28, year=assignment.date.year - 1
            )

        min_hist_date = min(
            a_date_minus_1_year,
            min(a.date for a in replacement_data.assignments),
        )

        max_date = max(a.date for a in replacement_data.assignments)

        dates_hist = build_dates_list(
            start_date=min_hist_date,
            end_date=assignment.date - timedelta(days=1),
        )

        dates_campaign = build_dates_list(start_date=assignment.date, end_date=max_date)

        periods_weekly = build_periods_weekly(
            dates_hist=dates_hist, dates_campaign=dates_campaign
        )
        periods_monthly = build_periods_monthly(
            dates_hist=dates_hist, dates_campaign=dates_campaign
        )
        periods_yearly = build_periods_yearly(
            dates_hist=dates_hist, dates_campaign=dates_campaign
        )

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=assignment.date,
            end_date=max_date,
            workers=replacement_data.workers,
            assignments=replacement_data.assignments,
        )

        constraints = parse_constraints(
            cbas=cbs_augmented,
            schedule_id="",
            workers=replacement_data.workers,
            worker_dim_dict=dim_to_attr_value_to_worker,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
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

        # Filter ConstraintFil to only include those relevant to the assignment
        constraints.fil = self._filter_all_constraint_fils(
            constraints, assignment.date.isoformat(), assignment.shift_id
        )

        # Remove ConstraintFai as they are not relevant
        constraints.fai = []

        a_filtered_out, _ = build_worker_shift_filters(
            workers=replacement_data.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=replacement_data.shifts,
            dimensions=replacement_data.dimensions,
            attributes=replacement_data.attributes,
            fixed_values={},
            penalty=0,
            shared_bool_policies={
                d.id: BoolSharedPolicy.SHIFT_TRUE_ONLY
                for d in replacement_data.dimensions
            },
        )

        # Filter a_filtered_out to only include the assignment date and shift
        a_filtered_out = [
            var
            for var in a_filtered_out
            if var[1] == assignment.date.isoformat() and var[2] == assignment.shift_id
        ]

        return constraints, a_filtered_out, dim_to_attr_value_to_shift

    def _process_replacement_data_for_multiple(
        self,
        assignments: List[Assignment],
        replacement_data: ReplacementData,
    ) -> tuple[Constraints, List[tuple[str, str, str]], Dict]:
        """
        Process replacement data for multiple assignments (used in swap validation).

        Similar to _process_replacement_data but handles multiple date/shift pairs.

        Args:
            assignments: List of assignments to consider
            replacement_data: Fetched replacement data

        Returns:
            Tuple of (Constraints, filtered_out_tuples, shift_dim_dict)
        """
        if not assignments:
            raise ValueError("At least one assignment must be provided")

        # Use the first assignment as reference for building base constraints
        reference_assignment = assignments[0]

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
            ref_date_minus_1_year = reference_assignment.date.replace(
                year=reference_assignment.date.year - 1
            )
        except ValueError:
            # Handles Feb 29 -> fallback to Feb 28 on non-leap year
            ref_date_minus_1_year = reference_assignment.date.replace(
                month=2, day=28, year=reference_assignment.date.year - 1
            )

        min_hist_date = min(
            ref_date_minus_1_year,
            min(a.date for a in replacement_data.assignments),
        )

        max_date = max(a.date for a in replacement_data.assignments)

        dates_hist = build_dates_list(
            start_date=min_hist_date,
            end_date=reference_assignment.date - timedelta(days=1),
        )

        dates_campaign = build_dates_list(
            start_date=reference_assignment.date, end_date=max_date
        )

        periods_weekly = build_periods_weekly(
            dates_hist=dates_hist, dates_campaign=dates_campaign
        )
        periods_monthly = build_periods_monthly(
            dates_hist=dates_hist, dates_campaign=dates_campaign
        )
        periods_yearly = build_periods_yearly(
            dates_hist=dates_hist, dates_campaign=dates_campaign
        )

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=reference_assignment.date,
            end_date=max_date,
            workers=replacement_data.workers,
            assignments=replacement_data.assignments,
        )

        constraints = parse_constraints(
            cbas=cbs_augmented,
            schedule_id="",
            workers=replacement_data.workers,
            worker_dim_dict=dim_to_attr_value_to_worker,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            periods_weekly=periods_weekly,
            periods_monthly=periods_monthly,
            periods_yearly=periods_yearly,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=replacement_data.shifts,
            shift_dim_dict=dim_to_attr_value_to_shift,
            penalties=penalties,
        )

        # Filter constraints for all assignments involved
        # We'll keep constraints that are relevant to any of the assignment
        # date/shift pairs
        date_shift_pairs = [(a.date.isoformat(), a.shift_id) for a in assignments]

        filtered_sums: List[ConstraintSum] = []
        for constraint_sum in constraints.sum:
            for date_iso, shift_id in date_shift_pairs:
                filtered_sum = self._filter_constraint_sum_for_assignment(
                    constraint_sum, date_iso, shift_id
                )
                if filtered_sum:
                    filtered_sums.append(filtered_sum)
                    break  # Don't add the same constraint multiple times

        filtered_seqs: List[ConstraintSeq] = []
        for constraint_seq in constraints.seq:
            for date_iso, shift_id in date_shift_pairs:
                filtered_seq = self._filter_constraint_seq_for_assignment(
                    constraint_seq, date_iso, shift_id
                )
                if filtered_seq:
                    filtered_seqs.append(filtered_seq)
                    break

        filtered_ords: List[ConstraintOrd] = []
        for constraint_ord in constraints.ord:
            for date_iso, shift_id in date_shift_pairs:
                filtered_ord = self._filter_constraint_ord_for_assignment(
                    constraint_ord, date_iso, shift_id
                )
                if filtered_ord:
                    filtered_ords.append(filtered_ord)
                    break

        filtered_fils: List[ConstraintFil] = []
        for constraint_fil in constraints.fil:
            for date_iso, shift_id in date_shift_pairs:
                filtered_fil = self._filter_constraint_fil_for_assignment(
                    constraint_fil, date_iso, shift_id
                )
                if filtered_fil:
                    filtered_fils.append(filtered_fil)
                    break

        constraints.sum = filtered_sums
        constraints.seq = filtered_seqs
        constraints.ord = filtered_ords
        constraints.fil = filtered_fils
        constraints.fai = []

        a_filtered_out, _ = build_worker_shift_filters(
            workers=replacement_data.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=replacement_data.shifts,
            dimensions=replacement_data.dimensions,
            attributes=replacement_data.attributes,
            fixed_values={},
            penalty=0,
            shared_bool_policies={
                d.id: BoolSharedPolicy.SHIFT_TRUE_ONLY
                for d in replacement_data.dimensions
            },
        )

        # Filter a_filtered_out to only include the relevant date/shift pairs
        a_filtered_out = [
            var
            for var in a_filtered_out
            if any(
                var[1] == date_iso and var[2] == shift_id
                for date_iso, shift_id in date_shift_pairs
            )
        ]

        return constraints, a_filtered_out, dim_to_attr_value_to_shift

    # pylint: disable=too-many-arguments, too-many-locals
    def _build_swap_context(
        self,
        worker_a_assignments: List[Assignment],
        worker_b_assignments: List[Assignment],
        worker_a: Worker,
        worker_b: Worker,
        replacement_data: ReplacementData,
        constraints: Constraints,
        a_filtered_out: List[tuple[str, str, str]],
        shift_dim_dict: Dict,
    ) -> SwapContext:
        """
        Build context for evaluating an assignment swap.

        Args:
            worker_a_assignments: Original assignments for worker A
            worker_b_assignments: Original assignments for worker B
            worker_a: Worker A object
            worker_b: Worker B object
            replacement_data: Fetched replacement data
            constraints: Parsed constraints (already filtered for relevant dates/shifts)
            a_filtered_out: Filtered-out assignment tuples
            shift_dim_dict: Shift dimension dictionary

        Returns:
            SwapContext with pre-computed data for both workers
        """
        # Get shift objects
        shifts_dict = {s.id: s for s in replacement_data.shifts}

        # Compute assignment times for all assignments
        assignment_times = {}
        assignment_by_id = {a.id: a for a in replacement_data.assignments}
        for assignment in replacement_data.assignments:
            shift = shifts_dict.get(assignment.shift_id)
            if shift:
                duty_assignment = None
                duty_shift = None
                if (
                    shift.rest_type == ShiftRestType.RECUPERATION
                    and assignment.reference_assignment_id
                ):
                    duty_assignment = assignment_by_id.get(
                        assignment.reference_assignment_id
                    )
                    if duty_assignment:
                        duty_shift = shifts_dict.get(duty_assignment.shift_id)
                start_time, end_time = self._compute_assignment_datetimes(
                    assignment, shift, duty_assignment, duty_shift
                )
                assignment_times[assignment.id] = (start_time, end_time)

        # Augment requests
        worker_by_id = {w.id: w for w in replacement_data.workers}
        requests_augmented = []
        for req in replacement_data.requests:
            worker = worker_by_id.get(req.worker_id)
            if worker:
                request_aug = r_to_r_augmented(
                    request=req,
                    worker=worker,
                    shifts=replacement_data.shifts,
                    dimensions=replacement_data.dimensions,
                    dim_entries=replacement_data.dim_entries,
                    attributes=replacement_data.attributes,
                )
                # Filter to only active requests
                if request_aug.status == RequestStatus.APPROVED:
                    requests_augmented.append(request_aug)

        # Build current assignment tuples
        current_assignment_tuples = {
            (a.worker_id, a.date.isoformat(), a.shift_id)
            for a in replacement_data.assignments
        }

        # Build swapped assignment tuples
        swapped_assignment_tuples = current_assignment_tuples.copy()

        # Remove original assignments
        for assignment in worker_a_assignments:
            swapped_assignment_tuples.discard(
                (
                    assignment.worker_id,
                    assignment.date.isoformat(),
                    assignment.shift_id,
                )
            )
        for assignment in worker_b_assignments:
            swapped_assignment_tuples.discard(
                (
                    assignment.worker_id,
                    assignment.date.isoformat(),
                    assignment.shift_id,
                )
            )

        # Add swapped assignments (A gets B's dates/shifts, B gets A's dates/shifts)
        for assignment in worker_a_assignments:
            swapped_assignment_tuples.add(
                (worker_b.id, assignment.date.isoformat(), assignment.shift_id)
            )
        for assignment in worker_b_assignments:
            swapped_assignment_tuples.add(
                (worker_a.id, assignment.date.isoformat(), assignment.shift_id)
            )

        # Create actual Assignment objects for swapped assignments
        worker_a_swapped_assignments = []
        for assignment in worker_b_assignments:
            swapped_assignment = Assignment(
                id=f"swap_{assignment.id}_to_{worker_a.id}",
                team_id=assignment.team_id,
                schedule_id=assignment.schedule_id,
                worker_id=worker_a.id,  # Worker A gets B's assignments
                date=assignment.date,
                shift_id=assignment.shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
                source_id=None,
                reference_assignment_id=assignment.id,
            )
            worker_a_swapped_assignments.append(swapped_assignment)
            # Add to assignment_times
            if assignment.id in assignment_times:
                assignment_times[swapped_assignment.id] = assignment_times[
                    assignment.id
                ]

        worker_b_swapped_assignments = []
        for assignment in worker_a_assignments:
            swapped_assignment = Assignment(
                id=f"swap_{assignment.id}_to_{worker_b.id}",
                team_id=assignment.team_id,
                schedule_id=assignment.schedule_id,
                worker_id=worker_b.id,  # Worker B gets A's assignments
                date=assignment.date,
                shift_id=assignment.shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
                source_id=None,
                reference_assignment_id=assignment.id,
            )
            worker_b_swapped_assignments.append(swapped_assignment)
            # Add to assignment_times
            if assignment.id in assignment_times:
                assignment_times[swapped_assignment.id] = assignment_times[
                    assignment.id
                ]

        # Build all_swapped_assignments: all current assignments except
        # the ones being swapped, plus the new swapped assignments
        all_swapped_assignments = [
            a
            for a in replacement_data.assignments
            if a.id
            not in {assgn.id for assgn in worker_a_assignments + worker_b_assignments}
        ]
        all_swapped_assignments.extend(worker_a_swapped_assignments)
        all_swapped_assignments.extend(worker_b_swapped_assignments)

        return SwapContext(
            worker_a=worker_a,
            worker_b=worker_b,
            all_current_assignments=replacement_data.assignments,
            all_swapped_assignments=all_swapped_assignments,
            worker_a_current_assignments=worker_a_assignments,
            worker_b_current_assignments=worker_b_assignments,
            worker_a_swapped_assignments=worker_a_swapped_assignments,
            worker_b_swapped_assignments=worker_b_swapped_assignments,
            workers=replacement_data.workers,
            shifts=replacement_data.shifts,
            constraints=constraints,
            a_filtered_out=a_filtered_out,
            requests=replacement_data.requests,
            requests_augmented=requests_augmented,
            assignment_times=assignment_times,
            dimensions=replacement_data.dimensions,
            dim_entries=replacement_data.dim_entries,
            attributes=replacement_data.attributes,
            shift_dim_dict=shift_dim_dict,
            current_assignment_tuples=current_assignment_tuples,
            swapped_assignment_tuples=swapped_assignment_tuples,
        )

    def _build_swap_implications_for_worker(
        self,
        worker: Worker,
        worker_assignments: List[Assignment],
        swapped_assignments: List[Assignment],
        swap_context: SwapContext,
    ) -> SwapAssignmentInfo:
        """
        Build implications for one worker in a swap.

        Args:
            worker: The worker being evaluated
            worker_assignments: The worker's original assignments
            swapped_assignments: The assignments the worker would receive
            swap_context: Pre-computed swap context

        Returns:
            SwapAssignmentInfo with pre_swap and post_swap implications
        """
        # Evaluate current assignments (pre-swap state)
        pre_swap = []
        for assignment in worker_assignments:
            # Build a ReplacementContext for this specific assignment
            context = self._build_replacement_context_from_swap_context(
                assignment=assignment,
                swap_context=swap_context,
                use_swapped_state=False,
            )
            implications = self._build_replacement_implications(
                worker=worker, context=context
            )
            category = self._determine_replacement_category(implications)
            reason = ReplacementCandidate.compute_most_constraining_reason(implications)
            pre_swap.append(
                AssignmentImplication(
                    assignment_id=assignment.id,
                    implications=implications,
                    replacement_category=category,
                    most_constraining_reason=reason,
                )
            )

        # Evaluate swapped assignments (post-swap state)
        # Use the pre-created swapped assignments from SwapContext
        post_swap = []
        for swapped_assignment in swapped_assignments:
            # Build a ReplacementContext for this swapped assignment
            context = self._build_replacement_context_from_swap_context(
                assignment=swapped_assignment,
                swap_context=swap_context,
                use_swapped_state=True,
            )
            implications = self._build_replacement_implications(
                worker=worker, context=context
            )
            category = self._determine_replacement_category(implications)
            reason = ReplacementCandidate.compute_most_constraining_reason(implications)
            if not swapped_assignment.reference_assignment_id:
                raise ValueError(
                    f"Swapped assignment {swapped_assignment.id} is missing "
                    "reference_assignment_id"
                )
            post_swap.append(
                AssignmentImplication(
                    assignment_id=swapped_assignment.reference_assignment_id,
                    implications=implications,
                    replacement_category=category,
                    most_constraining_reason=reason,
                )
            )

        return SwapAssignmentInfo(
            worker_id=worker.id,
            worker_name=worker.name,
            pre_swap=pre_swap,
            post_swap=post_swap,
        )

    def _build_replacement_context_from_swap_context(
        self,
        assignment: Assignment,
        swap_context: SwapContext,
        use_swapped_state: bool,
    ) -> ReplacementContext:
        """
        Build a ReplacementContext from a SwapContext for a specific assignment.

        Args:
            assignment: The assignment to build context for
            swap_context: The pre-computed swap context
            use_swapped_state: If True, use swapped assignment tuples; else use current

        Returns:
            ReplacementContext for the specific assignment
        """
        # Get the target shift
        target_shift = next(
            (s for s in swap_context.shifts if s.id == assignment.shift_id),
            None,
        )
        if not target_shift:
            raise ValueError(f"Shift {assignment.shift_id} not found")

        # Choose which assignments and assignment tuples to use
        assignments = (
            swap_context.all_swapped_assignments
            if use_swapped_state
            else swap_context.all_current_assignments
        )
        assignment_tuples = (
            swap_context.swapped_assignment_tuples
            if use_swapped_state
            else swap_context.current_assignment_tuples
        )

        return ReplacementContext(
            target_assignment=assignment,
            target_shift=target_shift,
            assignment_date=assignment.date,
            workers=swap_context.workers,
            shifts=swap_context.shifts,
            constraints=swap_context.constraints,
            a_filtered_out=swap_context.a_filtered_out,
            assignments=assignments,
            requests=swap_context.requests,
            requests_augmented=swap_context.requests_augmented,
            assignment_times=swap_context.assignment_times,
            dimensions=swap_context.dimensions,
            dim_entries=swap_context.dim_entries,
            attributes=swap_context.attributes,
            shift_dim_dict=swap_context.shift_dim_dict,
            assignment_tuples=assignment_tuples,
        )

    def _can_do_assignment(self, implications: ReplacementImplications) -> bool:
        """
        Check if implications indicate the assignment can be done (no hard
        constraint violations).

        Args:
            implications: ReplacementImplications to check

        Returns:
            True if all hard constraints are met
        """
        return (
            implications.is_employed
            and implications.has_specialty
            and implications.isnt_on_leave
            and implications.filter_hits.isnt_filtered_out
            and implications.overlap_hits.hasnt_overlap
            and implications.hard_constraint_hits.meets_constraints
            and implications.request_hits.has_no_request_conflict
        )
