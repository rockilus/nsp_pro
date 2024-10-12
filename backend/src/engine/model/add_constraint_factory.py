from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint_eve import AddConstraintEve
from engine.model.add_constraint_fai import AddConstraintFai
from engine.model.add_constraint_fil import AddConstraintFil
from engine.model.add_constraint_ord import AddConstraintOrd
from engine.model.add_constraint_seq import AddConstraintSeq
from engine.model.add_constraint_sum import AddConstraintSum
from engine.model.add_coverage import AddCoverage
from engine.model.add_request import AddRequest
from engine.types.input_output_types import Shift, Worker
from engine.types.model_types import Objective


# pylint: disable=too-few-public-methods
class AddConstraintFactory:
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
    ):
        self.add_constraint_sum = AddConstraintSum(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_constraint_seq = AddConstraintSeq(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_constraint_ord = AddConstraintOrd(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_constraint_fil = AddConstraintFil(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_constraint_fai = AddConstraintFai(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_constraint_eve = AddConstraintEve(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_coverage = AddCoverage(
            model,
            variables,
            assignment_wdss,
            durations,
            workers,
            worker_ids,
            days,
            shifts,
            shift_ids,
            obj,
            model_config,
        )
        self.add_request = AddRequest(
            model,
            variables,
            worker_ids,
            obj,
            model_config,
        )

        # self.model = model
        # self.variables = variables
        # self.durations = durations
        # self.workers = workers
        # self.days = days
        # self.shifts = shifts
        # self.obj = obj
        # self.model_config = model_config
        # self.add_constraint_sum = AddConstraintSum(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_constraint_seq = AddConstraintSeq(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_constraint_ord = AddConstraintOrd(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_constraint_fil = AddConstraintFil(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_constraint_fai = AddConstraintFai(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_constraint_eve = AddConstraintEve(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_coverage = AddCoverage(
        #     self.model,
        #     self.variables,
        #     self.durations,
        #     self.workers,
        #     self.days,
        #     self.shifts,
        #     self.obj,
        #     self.model_config,
        # )
        # self.add_far = AddRequest(
        #     self.model,
        #     self.variables,
        #     self.workers,
        #     self.obj,
        #     self.model_config,
        # )
