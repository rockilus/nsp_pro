from typing import List

from constraint_parser.mapping.map_constraint import MapConstaint
from constraint_parser.mapping.map_day import MapDay
from constraint_parser.mapping.map_shift import MapShift
from constraint_parser.mapping.map_worker import MapWorker
from core.constraint import Constraint, ConstraintBuild
from core.shift import Shift
from core.worker import Worker


class ConstraintMapping:
    def __init__(
        self,
        workers: List[Worker],
        shifts: List[Shift],
    ) -> None:
        self.workers = workers
        self.shifts = shifts
        self.map_worker = MapWorker(workers)
        self.map_day = MapDay()
        self.map_shift = MapShift(shifts)
        self.map_constraint = MapConstaint()

    def __call__(self, cstr_build: ConstraintBuild) -> Constraint:
        var_worker = self.map_worker(cstr_build)
        var_day = self.map_day(cstr_build)
        var_shift = self.map_shift(cstr_build)
        return self.map_constraint(cstr_build, var_worker, var_day, var_shift)
