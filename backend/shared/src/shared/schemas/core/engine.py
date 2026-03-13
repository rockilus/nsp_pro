from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List

from shared.schemas.core.assignment import Assignment
from shared.schemas.core.attribute import Attribute
from shared.schemas.core.breach import Breach
from shared.schemas.core.constraint import (
    ConstraintBuildAugmented,
    Penalties,
)
from shared.schemas.core.dim_entry import DimEntry
from shared.schemas.core.dimension import Dimension
from shared.schemas.core.link_shift import LinkShift
from shared.schemas.core.model_output import ModelOutput
from shared.schemas.core.request import Request, RequestAugmented
from shared.schemas.core.schedule import Schedule
from shared.schemas.core.shift import Shift
from shared.schemas.core.shift_demand_new import ShiftDemandNew
from shared.schemas.core.solve_task_status import (
    ScheduleSolveStatus,
    SolverOutputMetadata,
)
from shared.schemas.core.worker import Worker

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
    max_weekly_nb_duties: bool
    max_week_day_nb_duties: bool
    special_days_target_nb_duties: bool


@dataclass
class ConfigurationConstraints:
    work_loads: bool


# List of parameters:
# https://github.com/google/or-tools/blob/stable/ortools/sat/sat_parameters.proto


# pylint: disable=too-many-instance-attributes
@dataclass
class SolverParams:
    # LIMITS
    max_time_in_seconds: int = 30
    interleave_search: bool = False

    # OTHER PARAMETERS
    log_search_progress: bool = False
    log_subsolver_statistics: bool = False
    random_seed: int | None = None

    # PRESOLVE
    probing_deterministic_time_limit: float = 1.0
    max_presolve_iterations: int = 3
    cp_model_probing_level: int = 2
    detect_table_with_cost: bool = False

    # MULTITHREAD
    num_search_workers: int = 0
    subsolvers: List[str] | None = None
    ignore_subsolvers: List[str] | None = None

    # RESTART
    # NO_RESTART = 0;
    # Follow a Luby sequence times restart_period.
    # LUBY_RESTART = 1;
    # Moving average restart based on the decision level of conflicts.
    # DL_MOVING_AVERAGE_RESTART = 2;
    # Moving average restart based on the LBD of conflicts.
    # LBD_MOVING_AVERAGE_RESTART = 3;
    # Fixed period restart every restart period.
    # FIXED_RESTART = 4;
    restart_algorithms: List[str] | None = None
    restart_period: int = 50

    # LINEAR PROGRAMMING RELAXATION (1425)
    # 0: no LP relaxation
    # 1: only the linear constraint and full encoding are added
    # 2: also add all the Boolean constraints
    linearization_level: int = 1
    # 0: turn off all cut.
    # For now just one level. Most cuts are only used at linearization level >= 2.
    cut_level: int = 1

    # LNS PARAMETERS (1267)
    lns_initial_difficulty: float = 0.5  # to test
    lns_initial_deterministic_limit: float = 0.1  # to test
    use_lns_only: bool = False
    use_combined_no_overlap: bool = False  # solver returns UKNOWN status
    # 1: detect symmetries in presolve and try to fix Booleans
    # 2: also do some form of dynamic symmetry breaking during search
    # 3: also detect symmetries for very large models, which can be slow
    # 4: try to break as much symmetry as possible in presolve.
    symmetry_level: int = 2
    use_symmetry_in_lp: bool = False  # to test
    symmetry_detection_deterministic_time_limit: int = 1  # to test
    diversify_lns_params: bool = False  # to test

    # CONSTRAINT PROGRAMMING PARAMETERS
    use_strong_propagation_in_disjunctive: bool = False
    violation_ls_compound_move_probability: float = 0.5
    feasibility_jump_var_perburbation_range_ratio: float = 0.2
    instantiate_all_variables: bool = True
    optimize_with_core: bool = False

    # MAX_SAT PARAMETERS
    # 1: use a simple heuristic to try to minimize an UNSAT core.
    # 2: use propagation to minimize the core but also identifyliteral in at
    # most one relationship in this core.
    core_minimization_level: int = 2

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class CustomSolverParams:
    limit_number_solution: int | None
    solve_strategy: SolveStrategy


@dataclass
class ModelSetup:
    sol_hint: bool
    min_solve_time_seconds: int = 30
    max_solve_time_seconds: int = 120


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
    link_shifts: List[LinkShift]
    dimensions: List[Dimension]
    dim_entries: List[DimEntry]
    attributes: List[Attribute]
    as_hist: List[Assignment]
    as_wip_fixed: List[Assignment]
    as_wip_campaign: List[Assignment]
    cbs_augmented: List[ConstraintBuildAugmented]
    shift_demands: List[ShiftDemandNew]
    requests_work: List[RequestAugmented]
    requests_leave: List[Request]
    model_output: ModelOutput | None

    def to_dict(self) -> Dict:
        return {
            "schedule": self.schedule.to_dict(),
            "workers": [worker.to_dict() for worker in self.workers],
            "shifts": [shift.to_dict() for shift in self.shifts],
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
            "as_wip_campaign": [
                assignment.to_dict() for assignment in self.as_wip_campaign
            ],
            "cbs_augmented": [
                constraint.to_dict() for constraint in self.cbs_augmented
            ],
            "shift_demands": [
                demand.to_dict() for demand in self.shift_demands
            ],
            "requests_work": [
                request.to_dict() for request in self.requests_work
            ],
            "requests_leave": [
                request.to_dict() for request in self.requests_leave
            ],
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
            as_wip_campaign=[
                Assignment.from_dict(assignment)
                for assignment in data.get("as_wip_campaign", [])
            ],
            cbs_augmented=[
                ConstraintBuildAugmented.from_dict(constraint)
                for constraint in data["cbs_augmented"]
            ],
            shift_demands=[
                ShiftDemandNew.from_dict(demand)
                for demand in data["shift_demands"]
            ],
            requests_work=[
                RequestAugmented.from_dict(request)
                for request in data["requests"]
            ],
            requests_leave=[
                Request.from_dict(request)
                for request in data.get("requests_leave", [])
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

    @classmethod
    def from_engine_inputs(
        cls,
        engine_inputs: EngineInputs,
        penalties: Penalties,
        model_config: ModelConfig,
    ) -> "EngineInputsAugmented":
        return cls(
            schedule=engine_inputs.schedule,
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            link_shifts=engine_inputs.link_shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
            as_hist=engine_inputs.as_hist,
            as_wip_fixed=engine_inputs.as_wip_fixed,
            as_wip_campaign=engine_inputs.as_wip_campaign,
            cbs_augmented=engine_inputs.cbs_augmented,
            shift_demands=engine_inputs.shift_demands,
            requests_work=engine_inputs.requests_work,
            requests_leave=engine_inputs.requests_leave,
            model_output=engine_inputs.model_output,
            penalties=penalties,
            model_config=model_config,
        )


##############################
# Outputs
##############################


@dataclass
class EngineOutputs:
    schedule_solve_status: ScheduleSolveStatus
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[RequestAugmented]
    model_output: SolverOutputMetadata


@dataclass
class EngineOutputsAugmented:
    schedule: Schedule
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[RequestAugmented]

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
        )


# Ortools cp_model sobsolvers parameter:
# https://github.com/google/or-tools/blob/dd85ab7a037091450284d7ae15853efc6d5807a4/ortools/sat/cp_model_search.cc

# problem subsolvers: [
#   core,
#   default_lp,
#   fixed,
#   lb_tree_search,
#   max_lp,
#   no_lp,
#   probing,
#   pseudo_costs,
#   quick_restart,
#   quick_restart_no_lp,
#   reduced_costs
# ]
# first solution subsolvers: [
#   fj(2),
#   fs_random,
#   fs_random_no_lp,
#   fs_random_quick_restart_no_lp
# ]
# interleaved subsolvers: [
# feasibility_pump,
# graph_arc_lns,
# graph_cst_lns,
# graph_dec_lns,
# graph_var_lns,
# lb_relax_lns,
# ls,
# ls_lin,
# rins/rens,
# rnd_cst_lns,
# rnd_var_lns,
# scheduling_intervals_lns,
# scheduling_precedences_lns,
# scheduling_resource_windows_lns,
# scheduling_time_window_lns
# ]
# helper subsolvers: [
# neighborhood_helper,
# synchronization_agent,
# update_gap_integral
# ]
