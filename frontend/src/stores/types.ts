// Types
import { WorkerT, WorkerDimensionT } from "../components/Worker/types";
import { ShiftT, ShiftDimensionT } from "../components/Shift/types";
import { CoverageT } from "../components/Coverage/types";
import { ConstraintT, TemplateT } from "../components/Constraint/types";
import { RequestT } from "../components/Request/types";
import { CoverageSelectorT } from "../components/CoverageSelector/types";
import {
  AssignmentT,
  ScheduleT,
  ObjectiveBreachT,
} from "../components/Schedule/types";
import { TeamT } from "../containers/types";

export type ResponseStatusT = {
  statusOK: boolean;
  message: string;
};

export type SnackBarT = {
  open: boolean;
  message: string;
  type: string; // "success" | "error" | "warning" | "info";
};

export type BulkT = {
  selectedTeamId: string;
  teams: TeamT[];
  workers: WorkerT[];
  workerDimensions: WorkerDimensionT[];
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
  coverages: CoverageT[];
  constraints: ConstraintT[];
  constraintTemplates: TemplateT[];
  requests: RequestT[];
  coverageSelectors: CoverageSelectorT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
  objectiveBreaches: ObjectiveBreachT[];
};
