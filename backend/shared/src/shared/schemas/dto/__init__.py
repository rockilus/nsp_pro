from shared.schemas.dto.assignment import (
    AssignmentDTO,
    AssignmentsRecurrencesResultDTO,
    BulkAssignmentCreateDTO,
    BulkAssignmentDeleteDTO,
    BulkAssignmentToggleFixedDTO,
    BulkAssignmentUpdateDTO,
    SelectionIntentDTO,
)
from shared.schemas.dto.assignment_template import (
    ApplyAssignmentTemplateToDateRangeDTO,
    ApplyAssignmentsToTemplateWeekDTO,
    AssignmentTemplateApplicationResult,
    AssignmentTemplateCreateDTO,
    AssignmentTemplateDTO,
    AssignmentTemplateUpdateDTO,
    AssignmentTemplateWeekDataDTO,
)
from shared.schemas.dto.attribute import AttributeDTO
from shared.schemas.dto.auth import (
    ChangeEmailRequestDTO,
    ConfirmCodeRequestDTO,
    ConfirmForgotPasswordRequestDTO,
    ForgotPasswordRequestDTO,
    ResendCodeRequestDTO,
    SignInRequestDTO,
    SignUpRequestDTO,
    VerifyEmailRequestDTO,
)
from shared.schemas.dto.breach import BreachDTO
from shared.schemas.dto.campaign_quality import CampaignQualityDTO, WorkerQualityDTO
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
from shared.schemas.dto.import_merge import (
    AssignmentMergeConfig,
    MergeAction,
    MergeRequest,
    MergeResult,
    MergeTargetShift,
    MergeTargetsResponse,
    MergeTargetWorker,
    RequestMergeMapping,
    ShiftMergeMapping,
    WorkerMergeMapping,
)
from shared.schemas.dto.import_preview import (
    ImportAssignmentPreviewDTO,
    ImportMemberPreviewDTO,
    ImportPreviewDTO,
    ImportRequestPreviewDTO,
    ImportShiftPreviewDTO,
)
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
    AdminTeamRowDTO,
    MembershipForTeamWithMembershipDTO,
    PaginatedTeamsResponse,
    TeamDTO,
    TeamWithMembershipDTO,
)
from shared.schemas.dto.team_generation_settings import (
    TeamGenerationSettingsDTO,
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
    "ChangeEmailRequestDTO",
    "ConfirmCodeRequestDTO",
    "ConfirmForgotPasswordRequestDTO",
    "ForgotPasswordRequestDTO",
    "ResendCodeRequestDTO",
    "SignInRequestDTO",
    "SignUpRequestDTO",
    "VerifyEmailRequestDTO",
    "AssignmentDTO",
    "AssignmentsRecurrencesResultDTO",
    "BulkAssignmentCreateDTO",
    "BulkAssignmentDeleteDTO",
    "BulkAssignmentToggleFixedDTO",
    "BulkAssignmentUpdateDTO",
    "SelectionIntentDTO",
    "ApplyAssignmentTemplateToDateRangeDTO",
    "ApplyAssignmentsToTemplateWeekDTO",
    "AssignmentTemplateApplicationResult",
    "AssignmentTemplateCreateDTO",
    "AssignmentTemplateDTO",
    "AssignmentTemplateUpdateDTO",
    "AssignmentTemplateWeekDataDTO",
    "AttributeDTO",
    "BreachDTO",
    "CampaignQualityDTO",
    "WorkerQualityDTO",
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
    "ImportAssignmentPreviewDTO",
    "ImportMemberPreviewDTO",
    "ImportPreviewDTO",
    "ImportRequestPreviewDTO",
    "ImportShiftPreviewDTO",
    "AssignmentMergeConfig",
    "MergeAction",
    "MergeRequest",
    "MergeResult",
    "MergeTargetShift",
    "MergeTargetWorker",
    "MergeTargetsResponse",
    "RequestMergeMapping",
    "ShiftMergeMapping",
    "WorkerMergeMapping",
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
    "AdminTeamRowDTO",
    "MembershipForTeamWithMembershipDTO",
    "PaginatedTeamsResponse",
    "TeamDTO",
    "TeamGenerationSettingsDTO",
    "TeamWithMembershipDTO",
    "EnrichedTeamInvitationDTO",
    "TeamInvitationDTO",
    "PasswordDataDTO",
    "UserDTO",
    "UserWithMembershipDTO",
    "WorkerDTO",
]
