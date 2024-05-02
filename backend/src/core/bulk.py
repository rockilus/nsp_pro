from dataclasses import dataclass, field
from typing import Dict, List, Optional

from core.constraint import ConstraintBuild, Template
from core.coverage import Coverage, CoverageSelector, ShiftDemand
from core.request import Request
from core.schedule import Assignment, ObjectiveBreach, Schedule
from core.shift import Shift, ShiftDimension, ShiftProperty
from core.team import Team
from core.worker import Worker, WorkerDimension, WorkerProperty


# pylint: disable=too-many-instance-attributes
@dataclass
class Bulk:
    selected_team_id: Optional[str] = None
    teams: List[Team] = field(default_factory=list)
    workers: List[Worker] = field(default_factory=list)
    worker_properties_w: Dict[str, List[WorkerProperty]] = field(default_factory=dict)
    worker_dimensions: List[WorkerDimension] = field(default_factory=list)
    shifts: List[Shift] = field(default_factory=list)
    shift_properties_s: Dict[str, List[ShiftProperty]] = field(default_factory=dict)
    shift_dimensions: List[ShiftDimension] = field(default_factory=list)
    coverages: List[Coverage] = field(default_factory=list)
    shift_demands: Dict[str, List[ShiftDemand]] = field(default_factory=dict)
    shift_demand_shifts: Dict[str, List[Shift]] = field(default_factory=dict)
    constraint_builds: List[ConstraintBuild] = field(default_factory=list)
    constraint_templates: List[Template] = field(default_factory=list)
    requests: List[Request] = field(default_factory=list)
    coverage_selectors: List[CoverageSelector] = field(default_factory=list)
    assignments: List[Assignment] = field(default_factory=list)
    schedule: Optional[Schedule] = None
    objective_breaches: List[ObjectiveBreach] = field(default_factory=list)
