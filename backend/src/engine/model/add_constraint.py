from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.types.input_output_types import Shift, Worker
from engine.types.model_types import Objective


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
