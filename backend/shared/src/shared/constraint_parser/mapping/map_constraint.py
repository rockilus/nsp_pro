from datetime import date, timedelta
from typing import Dict, List, Tuple

from shared.constraint_parser.mapping.map_day import MapDay
from shared.constraint_parser.mapping.map_shift import MapShift
from shared.constraint_parser.mapping.map_worker import MapWorker
from shared.constraint_parser.mapping.utils import find_block_by_name
from shared.schemas import (
    Block,
    BlockNameOptions,
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    ConstraintType,
    Shift,
    Worker,
    WorkerDates,
)


class MapConstaint:
    # pylint: disable=too-many-arguments
    def __init__(
        self,
        workers: List[Worker],
        worker_dim_dict: Dict,
        dates_hist: List[date],
        dates_campaign: List[date],
        periods_weekly: List[List[date]],
        periods_monthly: List[List[date]],
        worker_ids_to_worker_dates: Dict[str, WorkerDates],
        shifts: List[Shift],
        shift_dim_dict: Dict,
        shift_ids_in_coverage: List[str] | None = None,
    ) -> None:
        self.workers = workers
        self.dates_hist = dates_hist
        self.dates_campaign = dates_campaign
        self.worker_ids_to_worker_dates = worker_ids_to_worker_dates
        self.shifts = shifts
        self.map_worker = MapWorker(workers, worker_dim_dict)
        self.map_day = MapDay(
            dates_hist, dates_campaign, periods_weekly, periods_monthly
        )
        self.map_shift = MapShift(shifts, shift_dim_dict, shift_ids_in_coverage)

    def map_constraint_sum(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintSum:
        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_days = self.map_day.get_coords_days_sum(cba)
        coord_shifts = self.map_shift.get_coords_shifts(cba, cstr_operator)
        # w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        # if not all(isinstance(item, str) for item in s_vars):
        #     raise TypeError(
        #         "Expected a list of strings, "
        #         + f"but got {format(type(s_vars))} instead."
        #     )
        # if constraint.target_unit == "hour":
        #     for w in w_vars:
        #         for period in d_vars:
        #             constraint_vars = []
        #             constraint_durs = []
        #             for s in s_vars:
        #                 constraint_vars.extend(
        #                     [self.variables[w, d, s] for d in period]  # type: ignore
        #                 )
        #                 constraint_durs.extend(
        #                     [self.durations[s] for _ in period]  # type: ignore
        #                 )
        #             self._add_constraint_sum_hour(
        #                 constraint,
        #                 constraint_vars,
        #                 constraint_durs,
        #                 hard_to_soft,
        #             )
        # else:
        constraints_vars: List[List[Tuple[str, str, str]]] = []
        for w in coord_workers:
            dates_worker_set = set(
                self.worker_ids_to_worker_dates[w.id].dates_hist
                + self.worker_ids_to_worker_dates[w.id].dates_campaign
            )
            for period in coord_days:
                period = sorted(list(set(period).intersection(dates_worker_set)))
                constraint_vars = []
                for s in coord_shifts:
                    constraint_vars += [(w.id, d.isoformat(), s.id) for d in period]
                constraints_vars.append(constraint_vars)
        return ConstraintSum(
            id=cba.id,
            constraint_type=cba.constraint_type,
            operator=cstr_operator,
            target_value=self.get_target_value(cba.blocks, cba.constraint_type),
            target_unit="",
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    def map_constraint_seq(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintSeq:
        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        cstr_target = self.get_target_value(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_days = self.map_day.get_coords_days_seq(cba, cstr_target)
        coord_shifts = self.map_shift.get_coords_shifts(cba, cstr_operator)

        constraints_vars: List[List[Tuple[str, str, str]]] = []
        for w in coord_workers:
            dates_worker_set = set(
                self.worker_ids_to_worker_dates[w.id].dates_hist
                + self.worker_ids_to_worker_dates[w.id].dates_campaign
            )
            for s in coord_shifts:
                constraint_vars = []
                dates_cstr = sorted(
                    list(set(coord_days).intersection(dates_worker_set))
                )
                for d in dates_cstr:
                    constraint_vars.append((w.id, d.isoformat(), s.id))
                constraints_vars.append(constraint_vars)

        return ConstraintSeq(
            id=cba.id,
            constraint_type=cba.constraint_type,
            operator=cstr_operator,
            target_value=cstr_target,
            target_unit="",
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    # pylint: disable=too-many-locals
    def map_constraint_ord(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintOrd:
        interval = self.map_day.get_interval(cba.blocks, cba.constraint_type)

        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_days = self.map_day.get_coords_days_ord(cba, interval)
        coord_shifts = self.map_shift.get_coords_shifts_ord(cba)

        constraints_vars: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]] = []
        for w in coord_workers:
            worker_dates = (
                self.worker_ids_to_worker_dates[w.id].dates_hist
                + self.worker_ids_to_worker_dates[w.id].dates_campaign
            )
            for d1, d2 in coord_days:
                if d1 not in worker_dates or d2 not in worker_dates:
                    continue
                for s_ref, s_rel in coord_shifts:
                    constraint_vars = (
                        (w.id, d1.isoformat(), s_ref.id),
                        (w.id, d2.isoformat(), s_rel.id),
                    )
                    constraints_vars.append(constraint_vars)

        return ConstraintOrd(
            id=cba.id,
            constraint_type=cba.constraint_type,
            operator=cstr_operator,
            target_value=self.get_target_value(cba.blocks, cba.constraint_type),
            target_unit="",
            shift_reference_ids=[s.id for s, _ in coord_shifts],
            shift_relative_ids=[s.id for _, s in coord_shifts],
            interval=interval,
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    def map_constraint_fil(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintFil:
        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_days = self.map_day.get_coords_days(cba)
        coord_shifts = self.map_shift.get_coords_shifts_fil(cba, cstr_operator)

        constraints_vars: List[Tuple[str, str, str]] = []
        for w in coord_workers:
            dates_worker_set = set(self.worker_ids_to_worker_dates[w.id].dates_campaign)

            dates_cstr = sorted(list(set(coord_days).intersection(dates_worker_set)))
            for d in dates_cstr:
                for s in coord_shifts:
                    constraints_vars.append((w.id, d.isoformat(), s.id))

        return ConstraintFil(
            id=cba.id,
            constraint_type=cba.constraint_type,
            operator=cstr_operator,
            target_value=self.get_target_value(cba.blocks, cba.constraint_type),
            target_unit="",
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    def map_constraint_fai(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintFai:
        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_days = self.map_day.get_coords_days(cba)
        coord_shifts = self.map_shift.get_coords_shifts(cba, cstr_operator)

        constraints_vars: List[List[Tuple[str, str, str]]] = [
            [
                (w.id, d.isoformat(), s.id)
                for d in coord_days
                if d in self.worker_ids_to_worker_dates[w.id].dates_campaign
                for s in coord_shifts
            ]
            for w in coord_workers
        ]

        return ConstraintFai(
            id=cba.id,
            constraint_type=cba.constraint_type,
            operator=cstr_operator,
            target_value=self.get_target_value(cba.blocks, cba.constraint_type),
            target_unit="",
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    # pylint: disable=too-many-locals
    def map_constraint_eve(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintSum:
        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_shifts = self.map_shift.get_coords_shifts(cba, cstr_operator)

        # target_average = get_average_nb_shifts_per_worker(
        #     coverage,
        #     constraint.worker_var.num_eligible_workers,
        #     d_vars,  # type: ignore
        #     s_vars,  # type: ignore
        # )
        target_average = 1
        period_lengths = self.integer_division_list(
            len(self.dates_campaign), int(target_average)
        )
        coord_days: List[List[date]] = []
        for index, period_length in enumerate(period_lengths):
            cum_days = sum(period_lengths[:index])
            start_date = self.dates_campaign[0] + timedelta(days=cum_days)
            end_date = start_date + timedelta(days=period_length - 1)
            coord_days.append(
                [d for d in self.dates_campaign if start_date <= d <= end_date]
            )

        constraints_vars: List[List[Tuple[str, str, str]]] = []
        for w in coord_workers:
            dates_worker_set = set(
                self.worker_ids_to_worker_dates[w.id].dates_hist
                + self.worker_ids_to_worker_dates[w.id].dates_campaign
            )
            for period in coord_days:
                period = sorted(list(set(period).intersection(dates_worker_set)))
                constraint_vars = []
                for s in coord_shifts:
                    constraint_vars += [(w.id, d.isoformat(), s.id) for d in period]
                constraints_vars.append(constraint_vars)

        return ConstraintSum(
            id=cba.id,
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
            target_value=1,
            target_unit="day",
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    @staticmethod
    def integer_division_list(numerator: int, denominator: int) -> List[int]:
        quotient = numerator // denominator
        remainder = numerator % denominator
        result = [quotient + 1] * remainder + [quotient] * (denominator - remainder)
        return result

    def get_operator(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> ConstraintOperator | None:
        if cstr_type in [ConstraintType.EVE, ConstraintType.FAI]:
            return None
        operator_block = find_block_by_name(blocks, BlockNameOptions.OPERATOR)
        if operator_block:
            if not isinstance(operator_block.value, str):
                raise ValueError("Operator block value is not a string")
            return self.convert_operator(operator_block.value)
        if cstr_type == ConstraintType.ORD:
            return ConstraintOperator.YES
        raise ValueError("Operator not found")

    def get_target_value(self, blocks: List[Block], cstr_type: ConstraintType) -> int:
        if cstr_type in [
            ConstraintType.ORD,
            ConstraintType.FIL,
            ConstraintType.EVE,
            ConstraintType.FAI,
        ]:
            return 0
        qty_block = find_block_by_name(blocks, BlockNameOptions.NUMBER)
        if qty_block:
            if not isinstance(qty_block.value, int):
                raise ValueError("Quantity block value is not an int")
            return qty_block.value
        raise ValueError("Target value not found")

    @staticmethod
    # pylint: disable=too-many-return-statements
    def convert_operator(
        operator: str,
    ) -> ConstraintOperator | None:
        operator_mod = operator.lower().replace(" ", "_")
        if operator_mod in ["less_than"]:
            return ConstraintOperator.LESS_THAN
        if operator_mod in [
            "less_than_or_equal",
            "less_than_or_equal_to",
            "at_most",
            "maximum",
        ]:
            return ConstraintOperator.LESS_THAN_OR_EQUAL
        if operator_mod in ["equal", "exactly"]:
            return ConstraintOperator.EQUAL
        if operator_mod in ["greater_than_or_equal", "at_least"]:
            return ConstraintOperator.GREATER_THAN_OR_EQUAL
        if operator_mod in ["yes", "should_only"]:
            return ConstraintOperator.YES
        if operator_mod in ["no", "should_not"]:
            return ConstraintOperator.NO
        raise ValueError(f"Operator {operator} not recognized")

    # def get_average_nb_shifts_per_worker(
    #     self,
    #     coverage: List[ShiftDemand],
    #     num_eligible_workers: int,
    #     days: List[str],
    #     shifts: List[str],
    # ) -> float:
    #     total_coverage = sum(
    #         self.get_total_coverage_shift(coverage, s, days) for s in shifts
    #     )
    #     target_average = total_coverage / num_eligible_workers
    #     return target_average

    # def get_total_coverage_shift(
    #     self, coverage: List[ShiftDemand], shift_id: str, days: List[str]
    # ) -> int:
    #     return sum(
    #         shift_demand.nb_times_shift  # QUICK FIX TO CHANGE XXX
    #         for shift_demand in coverage
    #         if shift_demand.shift_id == shift_id
    #         and shift_demand.date.isoformat() in days
    #     )

    # @staticmethod
    # # pylint: disable=R0801
    # def blocks_to_string_constraint(blocks: List[Block]) -> str:
    #     values = []
    #     for block in blocks:
    #         if isinstance(block.value, list):
    #             block_values = block.value
    #             if all(isinstance(v, dict) for v in block.value):
    #                 block_values = [v["name"] for v in block_values]  # type: ignore
    #             if len(block_values) > 1 and all(
    #                 isinstance(v, str) for v in block_values
    #             ):
    #                 values.append(
    #                     ', '.join(block_values[:-1])  # type: ignore
    #                     + ' and '
    #                     + block_values[-1]
    #                 )
    #             elif isinstance(block_values[0], str):
    #                 values.append(block_values[0])
    #         else:
    #             values.append(str(block.value))
    #     joined_values = ' '.join(values)
    #     capitalized_values = joined_values.capitalize()
    #     return capitalized_values + '.'
