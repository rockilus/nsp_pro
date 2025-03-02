from dataclasses import dataclass

from shared.database.databases.assignment_db import AssignmentDB
from shared.database.databases.attribute_db import AttributeDB
from shared.database.databases.breach_db import BreachDB
from shared.database.databases.config_db import ConfigDB
from shared.database.databases.constraint_build_db import ConstraintBuildDB
from shared.database.databases.coverage_db import CoverageDB
from shared.database.databases.coverage_selector_db import CoverageSelectorDB
from shared.database.databases.daily_shift_demand_db import DailyShiftDemandDB
from shared.database.databases.db import DB
from shared.database.databases.dim_entry_db import DimEntryDB
from shared.database.databases.dimension_db import DimensionDB
from shared.database.databases.link_shift_db import LinkShiftDB
from shared.database.databases.model_output_db import ModelOutputDB
from shared.database.databases.request_db import RequestDB
from shared.database.databases.schedule_db import ScheduleDB
from shared.database.databases.shift_db import ShiftDB
from shared.database.databases.shift_demand_db import ShiftDemandDB
from shared.database.databases.specialty_db import SpecialtyDB
from shared.database.databases.stats_header_db import StatsHeaderDB
from shared.database.databases.team_db import TeamDB
from shared.database.databases.user_db import UserDB
from shared.database.databases.worker_db import WorkerDB


# pylint: disable=too-many-instance-attributes
@dataclass
class DatabaseCollections:
    db: DB
    assignment_db: AssignmentDB
    attribute_db: AttributeDB
    breach_db: BreachDB
    config_db: ConfigDB
    constraint_build_db: ConstraintBuildDB
    coverage_db: CoverageDB
    coverage_selector_db: CoverageSelectorDB
    daily_shift_demand_db: DailyShiftDemandDB
    dim_entry_db: DimEntryDB
    dimension_db: DimensionDB
    link_shift_db: LinkShiftDB
    model_output_db: ModelOutputDB
    request_db: RequestDB
    schedule_db: ScheduleDB
    shift_db: ShiftDB
    shift_demand_db: ShiftDemandDB
    specialty_db: SpecialtyDB
    stats_header_db: StatsHeaderDB
    team_db: TeamDB
    user_db: UserDB
    worker_db: WorkerDB

    def __init__(self, db: DB):
        self.db = db
        self.assignment_db = AssignmentDB(db)
        self.attribute_db = AttributeDB(db)
        self.breach_db = BreachDB(db)
        self.config_db = ConfigDB(db)
        self.constraint_build_db = ConstraintBuildDB(db)
        self.coverage_db = CoverageDB(db)
        self.coverage_selector_db = CoverageSelectorDB(db)
        self.daily_shift_demand_db = DailyShiftDemandDB(db)
        self.dim_entry_db = DimEntryDB(db)
        self.dimension_db = DimensionDB(db)
        self.link_shift_db = LinkShiftDB(db)
        self.model_output_db = ModelOutputDB(db)
        self.request_db = RequestDB(db)
        self.schedule_db = ScheduleDB(db)
        self.shift_db = ShiftDB(db)
        self.shift_demand_db = ShiftDemandDB(db)
        self.specialty_db = SpecialtyDB(db)
        self.stats_header_db = StatsHeaderDB(db)
        self.team_db = TeamDB(db)
        self.user_db = UserDB(db)
        self.worker_db = WorkerDB(db)
