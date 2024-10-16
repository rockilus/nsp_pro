from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple, Union

from ortools.sat.python import cp_model  # type: ignore

from engine.types.input_output_types import (
    Constraint,
    ConstraintOperator,
    ConstraintType,
    Shift,
    Worker,
)
from engine.types.model_types import Objective
from utils.constants import Constants


# pylint: disable=too-few-public-methods, too-many-instance-attributes
class AddConstraint:
    # pylint: disable=too-many-arguments
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple[str, str, str], cp_model.IntVar],
        assignment_wdss: Dict[Tuple[str, str, str, str], cp_model.IntVar],
        durations: Dict[str, int],
        workers: List[Worker],
        worker_ids: List[str],
        days: List[str],
        shifts: List[Shift],
        shift_ids: List[str],
        obj: Objective,
        model_config: Dict,
    ) -> None:
        self.model = model
        self.variables = variables
        self.assignment_wdss = assignment_wdss
        self.durations = durations
        self.workers = workers
        self.worker_ids = worker_ids
        self.days = days
        self.shifts = shifts
        self.shift_ids = shift_ids
        self.obj = obj
        self.model_config = model_config

    def get_vars_coordinates(
        self,
        constraint: Constraint,
        shifts_in_coverage: Union[Set[str], None] = None,
    ) -> Tuple[
        List[str],
        Union[List[str], List[List[str]]],
        List[str] | List[List[str]],
    ]:
        return (
            self._get_coords_workers(constraint),
            self._get_coords_days(constraint),
            self._get_coords_shifts(constraint, shifts_in_coverage),
        )

    ##########################
    # Worker
    ##########################
    def _get_coords_workers(self, constraint: Constraint) -> List[str]:
        if constraint.worker_var.selector == "all":
            return self.worker_ids
        if constraint.worker_var.selector == "equal":
            return constraint.worker_var.target
        raise NotImplementedError(
            f"Worker selector {constraint.worker_var.selector} " + "not implemented"
        )

    ##########################
    # Day
    ##########################
    def _get_coords_days(
        self, constraint: Constraint
    ) -> Union[List[str], List[List[str]]]:
        if (
            constraint.constraint_type == ConstraintType.ORD
            and constraint.day_var.selector
            in [
                "all",
                "week_day_index",
            ]
        ):
            return self._get_coords_days_ord(constraint)
        if (
            constraint.constraint_type == ConstraintType.SUM
            and constraint.day_var.selector
            in [
                "all",
                "week",
                "period",
            ]
        ):
            return self._get_coords_days_sum(constraint)
        if constraint.day_var.selector == "all":
            return self.days
        if constraint.day_var.selector == "week_day_index":
            return [
                self.days[i]
                for i in range(
                    constraint.day_var.target,
                    len(self.days),
                    Constants.NUM_DAYS_WEEK,
                )
            ]
        raise NotImplementedError(
            f"Day selector {constraint.day_var.selector} " + "not implemented"
        )

    def _get_coords_days_ord(self, constraint: Constraint) -> List[List[str]]:
        d_vars: List[List[str]] = []
        if constraint.day_var.selector == "all":
            for i in range(
                abs(min(constraint.day_var.interval, 0)),
                len(self.days) - max(constraint.day_var.interval, 0),
            ):
                d_vars.append(
                    [self.days[i], self.days[i + constraint.day_var.interval]]
                )
            return d_vars
        start = (
            constraint.day_var.target
            if (constraint.day_var.target + constraint.day_var.interval >= 0)
            else constraint.day_var.target + Constants.NUM_DAYS_WEEK
        )
        for i in range(
            start,
            len(self.days) - max(constraint.day_var.interval, 0),
            Constants.NUM_DAYS_WEEK,
        ):
            d_vars.append(
                [
                    self.days[i],
                    self.days[i + constraint.day_var.interval],
                ]
            )
        return d_vars

    def _get_coords_days_sum(self, constraint: Constraint) -> List[List[str]]:
        if constraint.day_var.selector == "all":
            return [self.days]
        if constraint.day_var.selector == "week":
            weekday_first_day = datetime.strptime(
                self.days[0], Constants.ENGINE_STRING_DATE_FORMAT
            ).weekday()
            d_indexes = AddConstraint._build_weeks_day_index_list(
                weekday_first_day, len(self.days)
            )
            return [[self.days[i] for i in d_index] for d_index in d_indexes]
        period = [
            constraint.day_var.start_date + timedelta(days=i)
            for i in range(
                (constraint.day_var.end_date - constraint.day_var.start_date).days + 1
            )
        ]
        return [
            [
                day.strftime(Constants.ENGINE_STRING_DATE_FORMAT)
                for day in period
                if day.strftime(Constants.ENGINE_STRING_DATE_FORMAT) in self.days
            ]
        ]

    ##########################
    # Shift
    ##########################
    def _get_coords_shifts(
        self,
        constraint: Constraint,
        shifts_in_coverage: Union[Set[str], None] = None,
    ) -> List[str] | List[List[str]]:
        if constraint.constraint_type == ConstraintType.ORD:
            return self._get_coords_shifts_ord(constraint)
        if constraint.shift_var.selector == "all":
            if shifts_in_coverage is not None:
                return [s for s in self.shift_ids if s in shifts_in_coverage]
            return self.shift_ids
        if constraint.shift_var.selector == "equal":
            if constraint.constraint_type == ConstraintType.FIL:
                return self._get_coords_shifts_fil(constraint)
            return constraint.shift_var.target
        raise NotImplementedError(
            f"Shift selector {constraint.shift_var.selector} " + "not implemented"
        )

    def _get_coords_shifts_fil(self, constraint: Constraint) -> List[str]:
        if constraint.operator == ConstraintOperator.NO:
            return constraint.shift_var.target
        return [s for s in self.shift_ids if s not in constraint.shift_var.target]

    def _get_coords_shifts_ord(self, constraint: Constraint) -> List[List[str]]:
        return [
            [s_ref, s_rel]
            for s_ref in constraint.shift_var.reference
            for s_rel in constraint.shift_var.relative
        ]

    @staticmethod
    def _build_weeks_day_index_list(
        first_day_index: int, num_days: int
    ) -> List[List[int]]:
        week_length = 7
        weeks = []
        week_start_index = 0
        while week_start_index < num_days:
            if week_start_index == 0:
                week_end_index = min(
                    week_start_index + week_length - first_day_index, num_days
                )
            else:
                week_end_index = min(week_start_index + week_length, num_days)
            weeks.append(list(range(week_start_index, week_end_index)))
            week_start_index = week_end_index
        return weeks
