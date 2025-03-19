from dataclasses import dataclass

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.assignment import (
    AssignmentRepository,
)
from shared.database_pymongo.repositories.attribute import AttributeRepository
from shared.database_pymongo.repositories.breach import BreachRepository
from shared.database_pymongo.repositories.config import ConfigRepository
from shared.database_pymongo.repositories.constraint_build import (
    ConstraintBuildRepository,
)
from shared.database_pymongo.repositories.coverage import CoverageRepository
from shared.database_pymongo.repositories.coverage_selector import (
    CoverageSelectorRepository,
)
from shared.database_pymongo.repositories.daily_shift_demand import (
    DailyShiftDemandRepository,
)
from shared.database_pymongo.repositories.dim_entry import DimEntryRepository
from shared.database_pymongo.repositories.dimension import DimensionRepository
from shared.database_pymongo.repositories.link_shift import LinkShiftRepository
from shared.database_pymongo.repositories.model_output import (
    ModelOutputRepository,
)
from shared.database_pymongo.repositories.request import RequestRepository
from shared.database_pymongo.repositories.schedule import ScheduleRepository
from shared.database_pymongo.repositories.shift import ShiftRepository
from shared.database_pymongo.repositories.shift_demand import (
    ShiftDemandRepository,
)
from shared.database_pymongo.repositories.specialty import SpecialtyRepository
from shared.database_pymongo.repositories.stats_header import (
    StatsHeaderRepository,
)
from shared.database_pymongo.repositories.team import TeamRepository
from shared.database_pymongo.repositories.user import UserRepository
from shared.database_pymongo.repositories.worker import WorkerRepository


# pylint: disable=too-many-instance-attributes
@dataclass
class DatabaseCollections:
    assignment_db: AssignmentRepository
    attribute_db: AttributeRepository
    breach_db: BreachRepository
    config_db: ConfigRepository
    constraint_build_db: ConstraintBuildRepository
    coverage_db: CoverageRepository
    coverage_selector_db: CoverageSelectorRepository
    daily_shift_demand_db: DailyShiftDemandRepository
    dim_entry_db: DimEntryRepository
    dimension_db: DimensionRepository
    link_shift_db: LinkShiftRepository
    model_output_db: ModelOutputRepository
    request_db: RequestRepository
    schedule_db: ScheduleRepository
    shift_db: ShiftRepository
    shift_demand_db: ShiftDemandRepository
    specialty_db: SpecialtyRepository
    stats_header_db: StatsHeaderRepository
    team_db: TeamRepository
    user_db: UserRepository
    worker_db: WorkerRepository

    def __init__(self, db_uri: str, db_name: str):
        MongoDB.connect(db_uri, db_name)
        self.db = MongoDB
        self.assignment_db = AssignmentRepository()
        self.attribute_db = AttributeRepository()
        self.breach_db = BreachRepository()
        self.config_db = ConfigRepository()
        self.constraint_build_db = ConstraintBuildRepository()
        self.coverage_db = CoverageRepository()
        self.coverage_selector_db = CoverageSelectorRepository()
        self.daily_shift_demand_db = DailyShiftDemandRepository()
        self.dim_entry_db = DimEntryRepository()
        self.dimension_db = DimensionRepository()
        self.link_shift_db = LinkShiftRepository()
        self.model_output_db = ModelOutputRepository()
        self.request_db = RequestRepository()
        self.schedule_db = ScheduleRepository()
        self.shift_db = ShiftRepository()
        self.shift_demand_db = ShiftDemandRepository()
        self.specialty_db = SpecialtyRepository()
        self.stats_header_db = StatsHeaderRepository()
        self.team_db = TeamRepository()
        self.user_db = UserRepository()
        self.worker_db = WorkerRepository()
