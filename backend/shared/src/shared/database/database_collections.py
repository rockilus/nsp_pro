from dataclasses import dataclass

from shared.database.database import MongoDB
from shared.database.repositories.assignment import AssignmentRepository
from shared.database.repositories.attribute import AttributeRepository
from shared.database.repositories.breach import BreachRepository
from shared.database.repositories.config import ConfigRepository
from shared.database.repositories.constraint_build import (
    ConstraintBuildRepository,
)
from shared.database.repositories.coverage import CoverageRepository
from shared.database.repositories.dim_entry import DimEntryRepository
from shared.database.repositories.dimension import DimensionRepository
from shared.database.repositories.link_shift import LinkShiftRepository
from shared.database.repositories.model_output import ModelOutputRepository
from shared.database.repositories.multitasking import (
    MultitaskingGroupRepository,
)
from shared.database.repositories.recurrence import RecurrenceRepository
from shared.database.repositories.recurrence_exclusion import (
    RecurrenceExclusionRepository,
)
from shared.database.repositories.request import RequestRepository
from shared.database.repositories.schedule import ScheduleRepository
from shared.database.repositories.shift import ShiftRepository
from shared.database.repositories.shift_demand import ShiftDemandRepository
from shared.database.repositories.shift_demand_exclusion import (
    ShiftDemandExclusionRepository,
)
from shared.database.repositories.shift_demand_new import (
    ShiftDemandNewRepository,
)
from shared.database.repositories.shift_demand_template import (
    ShiftDemandTemplateRepository,
)
from shared.database.repositories.solve_task_status import (
    SolveTaskStatusRepository,
)
from shared.database.repositories.specialty import SpecialtyRepository
from shared.database.repositories.stats_header import StatsHeaderRepository
from shared.database.repositories.team import TeamRepository
from shared.database.repositories.team_invitation import (
    TeamInvitationRepository,
)
from shared.database.repositories.team_membership import (
    TeamMembershipRepository,
)
from shared.database.repositories.user import UserRepository
from shared.database.repositories.worker import WorkerRepository


# pylint: disable=too-many-instance-attributes
@dataclass
class DatabaseCollections:
    assignment_db: AssignmentRepository
    attribute_db: AttributeRepository
    breach_db: BreachRepository
    config_db: ConfigRepository
    constraint_build_db: ConstraintBuildRepository
    coverage_db: CoverageRepository
    dim_entry_db: DimEntryRepository
    dimension_db: DimensionRepository
    link_shift_db: LinkShiftRepository
    model_output_db: ModelOutputRepository
    multitasking_db: MultitaskingGroupRepository
    recurrence_db: RecurrenceRepository
    recurrence_exclusion_db: RecurrenceExclusionRepository
    request_db: RequestRepository
    schedule_db: ScheduleRepository
    shift_db: ShiftRepository
    shift_demand_db: ShiftDemandRepository
    shift_demand_exclusion_db: ShiftDemandExclusionRepository
    shift_demand_new_db: ShiftDemandNewRepository
    shift_demand_template_db: ShiftDemandTemplateRepository
    solve_task_status_db: SolveTaskStatusRepository
    specialty_db: SpecialtyRepository
    stats_header_db: StatsHeaderRepository
    team_db: TeamRepository
    team_invitation_db: TeamInvitationRepository
    team_membership_db: TeamMembershipRepository
    user_db: UserRepository
    worker_db: WorkerRepository

    def __init__(self, db_uri_or_database, db_name: str = ""):
        """
        Initialize database collections.

        Args:
            db_uri_or_database: Either a database URI (str) or Database
            db_name: Database name (only used if first param is a URI)
        """
        if isinstance(db_uri_or_database, str):
            # Legacy behavior: connect using URI and database name
            if not db_name:
                raise ValueError("db_name is required when using URI string")
            MongoDB.connect(db_uri_or_database, db_name)
            self.db = MongoDB
        else:
            # New behavior: use existing database instance
            # Store the database instance for repositories that might need it
            self._database_instance = db_uri_or_database
            self.db = MongoDB  # Keep for backward compatibility

        self.assignment_db = AssignmentRepository()
        self.attribute_db = AttributeRepository()
        self.breach_db = BreachRepository()
        self.config_db = ConfigRepository()
        self.constraint_build_db = ConstraintBuildRepository()
        self.coverage_db = CoverageRepository()
        self.dim_entry_db = DimEntryRepository()
        self.dimension_db = DimensionRepository()
        self.link_shift_db = LinkShiftRepository()
        self.model_output_db = ModelOutputRepository()
        self.multitasking_db = MultitaskingGroupRepository()
        self.recurrence_db = RecurrenceRepository()
        self.recurrence_exclusion_db = RecurrenceExclusionRepository()
        self.request_db = RequestRepository()
        self.schedule_db = ScheduleRepository()
        self.shift_db = ShiftRepository()
        self.shift_demand_db = ShiftDemandRepository()
        self.shift_demand_exclusion_db = ShiftDemandExclusionRepository()
        self.shift_demand_new_db = ShiftDemandNewRepository()
        self.shift_demand_template_db = ShiftDemandTemplateRepository()
        self.solve_task_status_db = SolveTaskStatusRepository()
        self.specialty_db = SpecialtyRepository()
        self.stats_header_db = StatsHeaderRepository()
        self.team_db = TeamRepository()
        self.team_invitation_db = TeamInvitationRepository()
        self.team_membership_db = TeamMembershipRepository()
        self.user_db = UserRepository()
        self.worker_db = WorkerRepository()
