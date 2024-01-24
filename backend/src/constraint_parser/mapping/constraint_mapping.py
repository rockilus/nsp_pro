from datetime import date
from typing import Dict, List

from core.constraint import (
    Block,
    Constraint,
    ConstraintBuild,
    VarDay,
    VarShift,
    VarWorker,
)
from core.shift import Shift
from core.worker import Worker


class ConstraintMapping:
    def __init__(
        self,
        workers: List[Worker],
        shifts: List[Shift],
        worker_dimensions: Dict,
        shift_dimensions: Dict,
    ) -> None:
        self.workers = workers
        self.shifts = shifts
        self.worker_dimensions = worker_dimensions
        self.shift_dimensions = shift_dimensions

    def __call__(self, cstr_build: ConstraintBuild) -> Constraint:
        return self.map_constraint(cstr_build)

    def map_constraint(self, cstr_build: ConstraintBuild) -> Constraint:
        if cstr_build.constraint_type == "sum":
            constraint = self.build_constraint_sum(cstr_build)
        elif cstr_build.constraint_type == "seq":
            constraint = self.build_constraint_seq(cstr_build)
        elif cstr_build.constraint_type == "ord":
            constraint = self.build_constraint_ord(cstr_build)
        else:
            raise ValueError(
                f"Constraint type {cstr_build.constraint_type} not recognized"
            )
        return constraint

    def build_constraint_sum(self, cstr_build: ConstraintBuild) -> Constraint:
        var_worker = VarWorker(
            operator="",
            selector=self.get_worker_selector(cstr_build.blocks),
            target_ids=self.get_worker_target_ids(cstr_build.blocks),
            num_eligible_workers=0,
        )
        var_day = VarDay(
            selector=self.get_day_selector(cstr_build.blocks),
            target=0,
            start_date=date.today(),
            end_date=date.today(),
            interval=0,
        )
        var_shift = VarShift(
            operator="",
            selector=self.get_shift_selector(cstr_build.blocks),
            target_ids=self.get_shift_target_ids(cstr_build.blocks),
            reference_ids=[],
            relative_ids=[],
        )
        constraint = Constraint(
            id=cstr_build.id,
            constraint_type=cstr_build.constraint_type,
            template_id=cstr_build.template_id,
            operator=self.get_constraint_operator(cstr_build.blocks),
            target_value=self.get_constraint_target_value(cstr_build.blocks),
            target_unit="",
            worker_var=var_worker,
            day_var=var_day,
            shift_var=var_shift,
            active=cstr_build.active,
            hard=cstr_build.hard,
            priority=cstr_build.priority,
            text=self.blocks_to_string(cstr_build.blocks),
            blocks=cstr_build.blocks,
        )
        return constraint

    def build_constraint_seq(self, cstr_build: ConstraintBuild) -> Constraint:
        var_worker = VarWorker(
            operator="",
            selector=self.get_worker_selector(cstr_build.blocks),
            target_ids=self.get_worker_target_ids(cstr_build.blocks),
            num_eligible_workers=0,
        )
        var_day = VarDay(
            selector="all",
            target=0,
            start_date=date.today(),
            end_date=date.today(),
            interval=0,
        )
        var_shift = VarShift(
            operator="",
            selector=self.get_shift_selector(cstr_build.blocks),
            target_ids=self.get_shift_target_ids(cstr_build.blocks),
            reference_ids=[],
            relative_ids=[],
        )
        constraint = Constraint(
            id=cstr_build.id,
            constraint_type=cstr_build.constraint_type,
            template_id=cstr_build.template_id,
            operator=self.get_constraint_operator(cstr_build.blocks),
            target_value=self.get_constraint_target_value(cstr_build.blocks),
            target_unit="",
            worker_var=var_worker,
            day_var=var_day,
            shift_var=var_shift,
            active=cstr_build.active,
            hard=cstr_build.hard,
            priority=cstr_build.priority,
            text=self.blocks_to_string(cstr_build.blocks),
            blocks=cstr_build.blocks,
        )
        return constraint

    def build_constraint_ord(self, cstr_build: ConstraintBuild) -> Constraint:
        var_worker = VarWorker(
            operator="",
            selector=self.get_worker_selector(cstr_build.blocks),
            target_ids=self.get_worker_target_ids(cstr_build.blocks),
            num_eligible_workers=0,
        )
        var_day = VarDay(
            selector="all",
            target=0,
            start_date=date.today(),
            end_date=date.today(),
            interval=self.get_constraint_target_value(cstr_build.blocks),
        )
        var_shift = VarShift(
            operator="",
            # selector=self.get_shift_selector(cstr_build.blocks),
            # target_ids=self.get_shift_target_ids(cstr_build.blocks),
            selector="all",
            target_ids=[],
            reference_ids=self.get_shift_reference_target_ids(
                cstr_build.blocks
            ),
            relative_ids=self.get_shift_relative_target_ids(cstr_build.blocks),
        )
        constraint = Constraint(
            id=cstr_build.id,
            constraint_type="ord",
            template_id=cstr_build.template_id,
            operator=self.get_constraint_operator(cstr_build.blocks),
            target_value=0,
            target_unit="",
            worker_var=var_worker,
            day_var=var_day,
            shift_var=var_shift,
            active=cstr_build.active,
            hard=cstr_build.hard,
            priority=cstr_build.priority,
            text=self.blocks_to_string(cstr_build.blocks),
            blocks=cstr_build.blocks,
        )
        return constraint

    # VarWorker
    def get_worker_selector(self, blocks: List[Block]) -> str:
        worker_block = self.find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")
            for w in worker_block.value:
                if w == "all workers":
                    return "all"
            return "equal"
        raise ValueError("Worker block not found")

    def get_worker_target_ids(self, blocks: List[Block]) -> List[str]:
        worker_block = self.find_block_by_name(blocks, "worker")
        if worker_block:
            if not isinstance(worker_block.value, list):
                raise ValueError("Worker block value is not a list")
            out = []
            for w in worker_block.value:
                if w in ["all workers"]:
                    return []
                out.append(self.get_worker_id_from_name(w))
            return out
        raise ValueError("Worker block not found")

    def get_worker_id_from_name(self, worker_name: str) -> str:
        worker = self.find_worker_by_name(worker_name)
        if worker:
            return worker.id
        raise ValueError(f"Worker name {worker_name} not found")

    def find_worker_by_name(self, name: str) -> Worker | None:
        for worker in self.workers:
            if worker.name.lower() == name.lower():
                return worker
        return None

    # VarDay
    def get_day_selector(self, blocks: List[Block]) -> str:
        timing_block = self.find_block_by_name(blocks, "timing")
        if timing_block:
            if timing_block.value == "per week":
                return "week"
            raise ValueError(f"Operator {timing_block.value} not recognized")
        raise ValueError("Timing block not found")

    # VarShift
    def get_shift_selector(self, blocks: List[Block]) -> str:
        shift_block = self.find_block_by_name(blocks, "shift")
        if shift_block:
            if not isinstance(shift_block.value, list):
                raise ValueError("Shift block value is not a list")
            for s in shift_block.value:
                if s == "all shifts":
                    return "all"
            return "equal"
        raise ValueError("Shift block not found")

    def get_shift_target_ids(self, blocks: List[Block]) -> List[str]:
        shift_block = self.find_block_by_name(blocks, "shift")
        if shift_block:
            if not isinstance(shift_block.value, list):
                raise ValueError("Shift block value is not a list")
            out = []
            for s in shift_block.value:
                out.append(self.get_shift_id_from_name(s))
            return out
        raise ValueError("Shift block not found")

    def get_shift_reference_target_ids(self, blocks: List[Block]) -> List[str]:
        shift_ref_block = self.find_block_by_name(blocks, "shift_reference")
        if shift_ref_block:
            if not isinstance(shift_ref_block.value, list):
                raise ValueError("Shift reference block value is not a list")
            out = []
            for s in shift_ref_block.value:
                out.append(self.get_shift_id_from_name(s))
            return out
        raise ValueError("Shift reference block not found")

    def get_shift_relative_target_ids(self, blocks: List[Block]) -> List[str]:
        shift_rel_block = self.find_block_by_name(blocks, "shift_relative")
        if shift_rel_block:
            if not isinstance(shift_rel_block.value, list):
                raise ValueError("Shift relative block value is not a list")
            out = []
            for s in shift_rel_block.value:
                out.append(self.get_shift_id_from_name(s))
            return out
        raise ValueError("Shift relative block not found")

    def get_shift_id_from_name(self, shift_name: str) -> str:
        if shift_name in ["day off", "days off", "shift off", "shifts off"]:
            shift_name = "off"
        shift = self.find_shift_by_name(shift_name)
        if shift:
            return shift.id
        raise ValueError(f"Shift name {shift_name} not found")

    def find_shift_by_name(self, name: str) -> Shift | None:
        for shift in self.shifts:
            if shift.name.lower() == name.lower():
                return shift
        return None

    # Constraint
    def get_constraint_operator(self, blocks: List[Block]) -> str:
        operator_block = self.find_block_by_name(blocks, "operator")
        if operator_block:
            if not isinstance(operator_block.value, str):
                raise ValueError("Operator block value is not a string")
            return self.convert_operator(operator_block.value)
        raise ValueError("Operator not found")

    @staticmethod
    def convert_operator(operator: str) -> str:
        operator_mod = operator.lower().replace(" ", "_")
        if operator_mod in ["less_than"]:
            return "less_than"
        if operator_mod in [
            "less_than_or_equal",
            "less_than_or_equal_to",
            "at_most",
            "maximum",
        ]:
            return "less_than_or_equal"
        if operator_mod in ["equal", "exactly"]:
            return "equal"
        if operator_mod in ["greater_than_or_equal", "at_least"]:
            return "greater_than_or_equal"
        if operator_mod in ["yes", "no"]:
            return operator_mod
        raise ValueError(f"Operator {operator} not recognized")

    def get_constraint_target_value(self, blocks: List[Block]) -> int:
        qty_block = self.find_block_by_name(blocks, "#")
        if qty_block:
            if not isinstance(qty_block.value, int):
                raise ValueError("Quantity block value is not an int")
            return qty_block.value
        raise ValueError("Target value not found")

    @staticmethod
    def find_block_by_name(blocks: List[Block], name: str) -> Block | None:
        for block in blocks:
            if block.name == name:
                return block
        return None

    @staticmethod
    def blocks_to_string(blocks: List[Block]) -> str:
        values = []
        for block in blocks:
            if isinstance(block.value, list):
                if len(block.value) > 1:
                    values.append(
                        ', '.join(block.value[:-1]) + ' and ' + block.value[-1]
                    )
                else:
                    values.append(block.value[0])
            else:
                values.append(str(block.value))
        joined_values = ' '.join(values)
        capitalized_values = joined_values.capitalize()
        return capitalized_values + '.'
