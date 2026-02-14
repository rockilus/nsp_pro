import { Dayjs } from "dayjs";
import { AssignmentT } from "@/types/assignment";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { RequestT } from "@/types/request";
import { WorkerT } from "@/types/worker";
import { ShiftT } from "@/types/shift";
import {
  ScheduleT,
  AssignmentDataT,
  ScheduleCellDataT,
} from "@/types/schedule";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";
import { SpecialtyT } from "@/types/specialty";
import { ShiftWorkerOptionT } from "@/types/constraint";
import { TeamMembershipRole } from "@/types/team";

export enum ScheduleItemType {
  ASSIGNMENT = "assignment",
  DEMAND = "demand",
  REQUEST = "request",
}

export enum DialogMode {
  CREATE = "create",
  EDIT = "edit",
}

// Data needed to create a new assignment
export interface CreateAssignmentData {
  scheduleId: string | null;
  workerId: string | null;
  shiftId: string | null;
  date: Dayjs | null;
  addDemandActive?: boolean;
}

// Data needed to edit an existing assignment
export interface EditAssignmentData {
  assignmentData: AssignmentDataT;
}

// Data needed to create a new demand
export interface CreateDemandData {
  shiftId: string | null;
  date: Dayjs | null;
}

// Data needed to edit an existing demand
export interface EditDemandData {
  cellData: ScheduleCellDataT;
}

// Data needed to create a new request
export interface CreateRequestData {
  workerId: string | null;
  startDate?: Dayjs;
}

// Data needed to edit an existing request
export interface EditRequestData {
  request: RequestT;
}

export type ScheduleItemDialogData =
  | CreateAssignmentData
  | EditAssignmentData
  | CreateDemandData
  | EditDemandData
  | CreateRequestData
  | EditRequestData
  | null;

export interface ScheduleItemDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  mode: DialogMode;
  selectedType: ScheduleItemType;
  dialogData: ScheduleItemDialogData;

  // Team and schedule data
  teamId: string;
  scheduleId: string | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  specialties: SpecialtyT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  useSolver: boolean;

  // Assignment handlers
  handleCreateAssignment?: (
    newAssignment: AssignmentT,
    newRecurrence: RecurrenceRuleT | null,
  ) => void;
  handleUpdateAssignment?: (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null,
  ) => void;
  handleDeleteAssignment?: (
    assignmentId: string,
    recurrenceId: string | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null,
  ) => void;

  // Demand handlers
  handleCreateShiftDemand?: (
    shiftId: string,
    date: Dayjs,
    count: number,
    notes?: string,
  ) => Promise<void>;
  handleUpdateShiftDemand?: (demandId: string, updates: any) => Promise<void>;
  handleDeleteShiftDemand?: (demandId: string) => Promise<void>;

  // Request handlers
  handleAddRequest?: (request: RequestT) => void;
  handleUpdateRequest?: (request: RequestT) => void;
  handleDeleteRequest?: (requestId: string) => void;
  handleRescindRequest?: (requestId: string) => void;
  handleAcceptRequest?: (requestId: string) => void;
  handleDenyRequest?: (requestId: string) => void;
}
