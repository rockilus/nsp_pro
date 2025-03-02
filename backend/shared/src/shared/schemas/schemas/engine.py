from dataclasses import dataclass
from enum import Enum
from typing import Dict, List

from shared.schemas.schemas.attribute import Attribute
from shared.schemas.schemas.constraint import (
    ConstraintBuildAugmented,
    Penalties,
)
from shared.schemas.schemas.coverage import DailyShiftDemand
from shared.schemas.schemas.dimension import Dimension, DimEntry
from shared.schemas.schemas.model_output import ModelOutput
from shared.schemas.schemas.request import Request, RequestAugmented
from shared.schemas.schemas.schedule import Assignment, Breach, Schedule
from shared.schemas.schemas.shift import LinkShift, Shift
from shared.schemas.schemas.worker import Worker

##############################
# Model Config
##############################


class SolveStrategy(Enum):
    HARD_TO_SOFT = 0
    SEQUENTIAL = 1


@dataclass
class SystemConstraints:
    weekly_target_work_time: bool
    weekly_target_worktime_tolerance: float
    monthly_target_nb_duties: bool
    mthly_target_nb_duty_tolerance: float
    special_days_target_nb_duties: bool


@dataclass
class ConfigurationConstraints:
    work_loads: bool


@dataclass
class SolverParams:
    max_time_in_seconds: int
    num_search_workers: int
    log_search_progress: bool


@dataclass
class CustomSolverParams:
    limit_number_solution: int | None
    solve_strategy: SolveStrategy


@dataclass
class ModelSetup:
    sol_hint: bool


@dataclass
class ModelConfig:
    solver_params: SolverParams
    custom_solver_params: CustomSolverParams
    model_setup: ModelSetup
    system_constraints: SystemConstraints
    configuration_constraints: ConfigurationConstraints


##############################
# Inputs
##############################


# pylint: disable=too-many-instance-attributes
@dataclass
class EngineInputs:
    schedule: Schedule
    workers: List[Worker]
    shifts: List[Shift]
    shifts_recup_new: List[Shift]
    link_shifts: List[LinkShift]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    as_hist: List[Assignment]
    as_wip_fixed: List[Assignment]
    cbs_augmented: List[ConstraintBuildAugmented]
    daily_shift_demands: List[DailyShiftDemand]
    requests: List[Request]
    model_output: ModelOutput | None

    def to_dict(self) -> Dict:
        return {
            "schedule": self.schedule.to_dict(),
            "workers": [worker.to_dict() for worker in self.workers],
            "shifts": [shift.to_dict() for shift in self.shifts],
            "shifts_recup_new": [
                shift.to_dict() for shift in self.shifts_recup_new
            ],
            "link_shifts": [
                link_shift.to_dict() for link_shift in self.link_shifts
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
            "model_output": (
                self.model_output.to_dict() if self.model_output else None
            ),
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
            link_shifts=[
                LinkShift.from_dict(link) for link in data["link_shifts"]
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
            model_output=(
                ModelOutput.from_dict(data["model_output"])
                if data["model_output"]
                else None
            ),
        )


@dataclass
class EngineInputsAugmented(EngineInputs):
    penalties: Penalties
    model_config: ModelConfig


##############################
# Outputs
##############################


@dataclass
class EngineOutputs:
    schedule: Schedule
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[Request]
    model_output: ModelOutput

    def to_dict(self) -> Dict:
        return {
            "schedule": self.schedule.to_dict(),
            "assignments": [
                assignment.to_dict() for assignment in self.assignments
            ],
            "breaches": [breach.to_dict() for breach in self.breaches],
            "requests": [request.to_dict() for request in self.requests],
            "model_output": self.model_output.to_dict(),
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
            model_output=ModelOutput.from_dict(data["model_output"]),
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
    def from_dict(cls, data: Dict) -> "EngineOutputsAugmented":
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
