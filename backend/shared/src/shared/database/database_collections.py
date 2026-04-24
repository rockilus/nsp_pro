from dataclasses import dataclass

from shared.database.interface import DatabaseInterface
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
from shared.database.repositories.notification import NotificationRepository
from shared.database.repositories.notification_preferences import (
    NotificationPreferencesRepository,
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
from shared.database.repositories.swap import SwapRepository
from shared.database.repositories.team import TeamRepository
from shared.database.repositories.team_generation_settings import (
    TeamGenerationSettingsRepository,
)
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
    swap_db: SwapRepository
    team_db: TeamRepository
    team_invitation_db: TeamInvitationRepository
    team_membership_db: TeamMembershipRepository
    user_db: UserRepository
    worker_db: WorkerRepository
    notification_db: NotificationRepository
    notification_preferences_db: NotificationPreferencesRepository
    team_generation_settings_db: TeamGenerationSettingsRepository

    def __init__(self, database_interface: DatabaseInterface):
        """
        Initialize database collections with modern database interface.

        Args:
            database_interface: Database interface instance (MongoDB or DocumentDB)
        """
        # Store the database interface for health checks, etc.
        self.database_interface = database_interface

        # Initialize all repositories with the database interface
        self.assignment_db = AssignmentRepository(database_interface)
        self.attribute_db = AttributeRepository(database_interface)
        self.breach_db = BreachRepository(database_interface)
        self.config_db = ConfigRepository(database_interface)
        self.constraint_build_db = ConstraintBuildRepository(
            database_interface
        )
        self.coverage_db = CoverageRepository(database_interface)
        self.dim_entry_db = DimEntryRepository(database_interface)
        self.dimension_db = DimensionRepository(database_interface)
        self.link_shift_db = LinkShiftRepository(database_interface)
        self.model_output_db = ModelOutputRepository(database_interface)
        self.multitasking_db = MultitaskingGroupRepository(database_interface)
        self.recurrence_db = RecurrenceRepository(database_interface)
        self.recurrence_exclusion_db = RecurrenceExclusionRepository(
            database_interface
        )
        self.request_db = RequestRepository(database_interface)
        self.schedule_db = ScheduleRepository(database_interface)
        self.shift_db = ShiftRepository(database_interface)
        self.shift_demand_db = ShiftDemandRepository(database_interface)
        self.shift_demand_exclusion_db = ShiftDemandExclusionRepository(
            database_interface
        )
        self.shift_demand_new_db = ShiftDemandNewRepository(database_interface)
        self.shift_demand_template_db = ShiftDemandTemplateRepository(
            database_interface
        )
        self.solve_task_status_db = SolveTaskStatusRepository(
            database_interface
        )
        self.specialty_db = SpecialtyRepository(database_interface)
        self.stats_header_db = StatsHeaderRepository(database_interface)
        self.swap_db = SwapRepository(database_interface)
        self.team_db = TeamRepository(database_interface)
        self.team_invitation_db = TeamInvitationRepository(database_interface)
        self.team_membership_db = TeamMembershipRepository(database_interface)
        self.user_db = UserRepository(database_interface)
        self.worker_db = WorkerRepository(database_interface)
        self.notification_db = NotificationRepository(database_interface)
        self.notification_preferences_db = NotificationPreferencesRepository(
            database_interface
        )
        self.team_generation_settings_db = TeamGenerationSettingsRepository(
            database_interface
        )

    async def health_check(self) -> bool:
        """Check the health of the database connection."""
        return await self.database_interface.health_check()

    async def close(self) -> None:
        """Close the database connection."""
        await self.database_interface.disconnect()

    @classmethod
    async def create_and_connect(
        cls, database_interface: DatabaseInterface
    ) -> "DatabaseCollections":
        """
        Create DatabaseCollections and establish database connection.

        Args:
            database_interface: Database interface instance

        Returns:
            DatabaseCollections with connected database
        """
        await database_interface.connect()
        return cls(database_interface)
