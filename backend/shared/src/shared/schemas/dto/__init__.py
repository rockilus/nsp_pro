from shared.schemas.dto.assignment import (
    AssignmentDTO,
    AssignmentsRecurrencesResultDTO,
    BulkAssignmentCreateDTO,
    BulkAssignmentDeleteDTO,
    BulkAssignmentUpdateDTO,
    SelectionIntentDTO,
)
from shared.schemas.dto.attribute import AttributeDTO
from shared.schemas.dto.breach import BreachDTO
from shared.schemas.dto.constraint import (
    BlockDTO,
    ConstraintBuildDTO,
    MissingAttributeDTO,
    ShiftWorkerOptionDTO,
    TemplateDTO,
)
from shared.schemas.dto.daily_shift_demand import (
    DailyShiftDemandDTO,
    DeleteDailyShiftDemandRequestDTO,
)
from shared.schemas.dto.dim_entry import DimEntryDTO
from shared.schemas.dto.dimension import (
    DimensionDTO,
    DimensionsAndDimEntriesDTO,
    NewDimensionDTO,
)
from shared.schemas.dto.export_options import ExportOptionsDTO
from shared.schemas.dto.link_shift import LinkShiftDTO
from shared.schemas.dto.multitasking import (
    CreateMultitaskingGroupRequest,
    ShiftDemandConcurrencyDTO,
    ShiftDemandConcurrencyRequestDTO,
    ShiftDemandConcurrencyResponseDTO,
    UpdateMultitaskingGroupRequest,
)
from shared.schemas.dto.recurrence import OccurrenceInfoDTO, RecurrenceRuleDTO
from shared.schemas.dto.request import RequestDTO
from shared.schemas.dto.schedule import (
    DuplicateOptionsDTO,
    DuplicateRequestDTO,
    DuplicateResultDTO,
    PeriodDTO,
    ScheduleDTO,
    WorkTimeTableDataDTO,
    WorkTimeTableDTO,
)
from shared.schemas.dto.shift import ShiftDTO
from shared.schemas.dto.shift_demand_new import (
    ShiftDemandNewCreateDTO,
    ShiftDemandNewDTO,
    ShiftDemandNewUpdateDTO,
    ShiftDemandsResultDTO,
)
from shared.schemas.dto.shift_demand_template import (
    ApplyTemplateDTO,
    ShiftDemandTemplateCreateDTO,
    ShiftDemandTemplateDTO,
    ShiftDemandTemplateUpdateDTO,
    TemplateWeekDataDTO,
)
from shared.schemas.dto.solve_task_status import SolveTaskStatusResponseDTO
from shared.schemas.dto.specialty import SpecialtyDTO
from shared.schemas.dto.stats import (
    StatsDTO,
    StatsHeaderDTO,
    StatsOptionsDTO,
    StatsValueDTO,
)
from shared.schemas.dto.swap import (
    AddBidRequestDTO,
    CreateSwapRequestDTO,
    SwapBidDTO,
    SwapRequestDTO,
)
from shared.schemas.dto.team import (
    MembershipForTeamWithMembershipDTO,
    TeamDTO,
    TeamWithMembershipDTO,
)
from shared.schemas.dto.team_invitation import (
    EnrichedTeamInvitationDTO,
    TeamInvitationDTO,
)
from shared.schemas.dto.user import (
    PasswordDataDTO,
    UserDTO,
    UserWithMembershipDTO,
)
from shared.schemas.dto.worker import WorkerDTO

__all__ = [
    "AssignmentDTO",
    "AssignmentsRecurrencesResultDTO",
    "BulkAssignmentCreateDTO",
    "BulkAssignmentDeleteDTO",
    "BulkAssignmentUpdateDTO",
    "SelectionIntentDTO",
    "AttributeDTO",
    "BreachDTO",
    "BlockDTO",
    "ConstraintBuildDTO",
    "MissingAttributeDTO",
    "ShiftWorkerOptionDTO",
    "TemplateDTO",
    "DailyShiftDemandDTO",
    "DeleteDailyShiftDemandRequestDTO",
    "DimEntryDTO",
    "DimensionDTO",
    "DimensionsAndDimEntriesDTO",
    "NewDimensionDTO",
    "ExportOptionsDTO",
    "LinkShiftDTO",
    "AddBidRequestDTO",
    "CreateSwapRequestDTO",
    "SwapBidDTO",
    "SwapRequestDTO",
    "CreateMultitaskingGroupRequest",
    "ShiftDemandConcurrencyDTO",
    "ShiftDemandConcurrencyRequestDTO",
    "ShiftDemandConcurrencyResponseDTO",
    "UpdateMultitaskingGroupRequest",
    "OccurrenceInfoDTO",
    "RecurrenceRuleDTO",
    "RequestDTO",
    "DuplicateOptionsDTO",
    "DuplicateRequestDTO",
    "DuplicateResultDTO",
    "PeriodDTO",
    "ScheduleDTO",
    "WorkTimeTableDataDTO",
    "WorkTimeTableDTO",
    "ShiftDTO",
    "ShiftDemandNewCreateDTO",
    "ShiftDemandNewDTO",
    "ShiftDemandNewUpdateDTO",
    "ShiftDemandsResultDTO",
    "ApplyTemplateDTO",
    "ShiftDemandTemplateCreateDTO",
    "ShiftDemandTemplateDTO",
    "ShiftDemandTemplateUpdateDTO",
    "TemplateWeekDataDTO",
    "SolveTaskStatusResponseDTO",
    "SpecialtyDTO",
    "StatsDTO",
    "StatsHeaderDTO",
    "StatsOptionsDTO",
    "StatsValueDTO",
    "MembershipForTeamWithMembershipDTO",
    "TeamDTO",
    "TeamWithMembershipDTO",
    "EnrichedTeamInvitationDTO",
    "TeamInvitationDTO",
    "PasswordDataDTO",
    "UserDTO",
    "UserWithMembershipDTO",
    "WorkerDTO",
]
