from dataclasses import dataclass
from typing import Dict, List

from shared.schemas.schemas.attribute import Attribute
from shared.schemas.schemas.constraint import ConstraintBuildAugmented
from shared.schemas.schemas.coverage import DailyShiftDemand
from shared.schemas.schemas.dimension import Dimension, DimEntry
from shared.schemas.schemas.request import Request, RequestAugmented
from shared.schemas.schemas.schedule import Assignment, Breach, Schedule
from shared.schemas.schemas.shift import Shift
from shared.schemas.schemas.worker import Worker


# pylint: disable=too-many-instance-attributes
@dataclass
class EngineInputs:
    schedule: Schedule
    workers: List[Worker]
    shifts: List[Shift]
    shifts_recup_new: List[Shift]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    as_hist: List[Assignment]
    as_wip_fixed: List[Assignment]
    cbs_augmented: List[ConstraintBuildAugmented]
    daily_shift_demands: List[DailyShiftDemand]
    requests: List[Request]
    wip_assignments: List[Assignment]

    def to_dict(self) -> Dict:
        return {
            "schedule": self.schedule.to_dict(),
            "workers": [worker.to_dict() for worker in self.workers],
            "shifts": [shift.to_dict() for shift in self.shifts],
            "shifts_recup_new": [
                shift.to_dict() for shift in self.shifts_recup_new
            ],
            "dimensions": [dim.to_dict() for dim in self.dimensions],
            "dim_entries": [entry.to_dict() for entry in self.dim_entries],
            "attributes": [attr.to_dict() for attr in self.attributes],
            "as_hist": [assignment.to_dict() for assignment in self.as_hist],
            "as_wip_fixed": [
                assignment.to_dict() for assignment in self.as_wip_fixed
            ],
            "cbs_augmented": [
                constraint.to_dict() for constraint in self.cbs_augmented
            ],
            "daily_shift_demands": [
                demand.to_dict() for demand in self.daily_shift_demands
            ],
            "requests": [request.to_dict() for request in self.requests],
            "wip_assignments": [
                assignment.to_dict() for assignment in self.wip_assignments
            ],
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "EngineInputs":
        return cls(
            schedule=Schedule.from_dict(data["schedule"]),
            workers=[Worker.from_dict(worker) for worker in data["workers"]],
            shifts=[Shift.from_dict(shift) for shift in data["shifts"]],
            shifts_recup_new=[
                Shift.from_dict(shift) for shift in data["shifts_recup_new"]
            ],
            dimensions=[
                Dimension.from_dict(dim) for dim in data["dimensions"]
            ],
            dim_entries=[
                DimEntry.from_dict(entry) for entry in data["dim_entries"]
            ],
            attributes=[
                Attribute.from_dict(attr) for attr in data["attributes"]
            ],
            as_hist=[
                Assignment.from_dict(assignment)
                for assignment in data["as_hist"]
            ],
            as_wip_fixed=[
                Assignment.from_dict(assignment)
                for assignment in data["as_wip_fixed"]
            ],
            cbs_augmented=[
                ConstraintBuildAugmented.from_dict(constraint)
                for constraint in data["cbs_augmented"]
            ],
            daily_shift_demands=[
                DailyShiftDemand.from_dict(demand)
                for demand in data["daily_shift_demands"]
            ],
            requests=[
                Request.from_dict(request) for request in data["requests"]
            ],
            wip_assignments=[
                Assignment.from_dict(assignment)
                for assignment in data["wip_assignments"]
            ],
        )


@dataclass
class EngineOutputs:
    schedule: Schedule
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[Request]

    def to_dict(self) -> Dict:
        return {
            "schedule": self.schedule.to_dict(),
            "assignments": [
                assignment.to_dict() for assignment in self.assignments
            ],
            "breaches": [breach.to_dict() for breach in self.breaches],
            "requests": [request.to_dict() for request in self.requests],
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "EngineOutputs":
        return cls(
            schedule=Schedule.from_dict(data["schedule"]),
            assignments=[
                Assignment.from_dict(assignment)
                for assignment in data["assignments"]
            ],
            breaches=[Breach.from_dict(breach) for breach in data["breaches"]],
            requests=[
                Request.from_dict(request) for request in data["requests"]
            ],
        )


@dataclass
class EngineOutputsAugmented:
    schedule: Schedule
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[RequestAugmented]
    shifts_recup_new: List[Shift]

    def to_dict(self) -> Dict:
        return {
            "schedule": self.schedule.to_dict(),
            "assignments": [
                assignment.to_dict() for assignment in self.assignments
            ],
            "breaches": [breach.to_dict() for breach in self.breaches],
            "requests": [request.to_dict() for request in self.requests],
            "shifts_recup_new": [
                shift.to_dict() for shift in self.shifts_recup_new
            ],
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "EngineOutputs":
        return cls(
            schedule=Schedule.from_dict(data["schedule"]),
            assignments=[
                Assignment.from_dict(assignment)
                for assignment in data["assignments"]
            ],
            breaches=[Breach.from_dict(breach) for breach in data["breaches"]],
            requests=[
                RequestAugmented.from_dict(request)
                for request in data["requests"]
            ],
            shifts_recup_new=[
                Shift.from_dict(shift) for shift in data["shifts_recup_new"]
            ],
        )
