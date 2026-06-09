import { create } from 'zustand';
import type {
  WorkerMergeMapping,
  ShiftMergeMapping,
  RequestMergeMapping,
  AssignmentMergeConfig,
  MergeTargetsResponse,
} from '@/app/lib/import-merge-utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportMember {
  generatedId: string;
  name: string;
  acronym: string;
  employmentStartDate: number;
  employmentEndDate: number | null;
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  specialtyIds: string[];
  warnings: string[];
}

interface ImportShift {
  generatedId: string;
  name: string;
  acronym: string;
  shiftType: number;
  startTime: number;
  endTime: number;
  color: string;
  duty: boolean;
  mandatoryRest: boolean;
  warnings: string[];
}

interface ImportRequest {
  generatedId: string;
  workerName: string;
  workerId: string;
  startDate: number;
  endDate: number;
  shiftCode: string;
  status: string;
  warnings: string[];
}

interface ImportAssignment {
  generatedId: string;
  workerName: string;
  workerId: string;
  date: number;
  shiftCode: string;
  shiftId: string;
}

export interface ImportMergeStoreData {
  importId: string | null;
  importName: string;
  selectedTeamId: string | null;
  importData: {
    members: ImportMember[];
    shifts: ImportShift[];
    requests: ImportRequest[];
    assignments: ImportAssignment[];
  } | null;
  targets: MergeTargetsResponse | null;
  workerMappings: WorkerMergeMapping[];
  shiftMappings: ShiftMergeMapping[];
  requestMappings: RequestMergeMapping[];
  assignmentConfig: AssignmentMergeConfig;
}

interface ImportMergeStoreActions {
  setImportId: (id: string) => void;
  setImportName: (name: string) => void;
  setSelectedTeamId: (id: string | null) => void;
  setImportData: (data: ImportMergeStoreData['importData']) => void;
  setTargets: (targets: MergeTargetsResponse | null) => void;
  setWorkerMappings: (mappings: WorkerMergeMapping[]) => void;
  setShiftMappings: (mappings: ShiftMergeMapping[]) => void;
  setRequestMappings: (mappings: RequestMergeMapping[]) => void;
  setAssignmentConfig: (config: AssignmentMergeConfig) => void;
  reset: () => void;
}

type ImportMergeStore = ImportMergeStoreData & ImportMergeStoreActions;

const initialState: ImportMergeStoreData = {
  importId: null,
  importName: '',
  selectedTeamId: null,
  importData: null,
  targets: null,
  workerMappings: [],
  shiftMappings: [],
  requestMappings: [],
  assignmentConfig: {
    includeAll: true,
    startDate: null,
    endDate: null,
  },
};

export const useImportMergeStore = create<ImportMergeStore>((set) => ({
  ...initialState,
  setImportId: (id) => set({ importId: id }),
  setImportName: (name) => set({ importName: name }),
  setSelectedTeamId: (id) => set({ selectedTeamId: id }),
  setImportData: (data) => set({ importData: data }),
  setTargets: (targets) => set({ targets }),
  setWorkerMappings: (mappings) => set({ workerMappings: mappings }),
  setShiftMappings: (mappings) => set({ shiftMappings: mappings }),
  setRequestMappings: (mappings) => set({ requestMappings: mappings }),
  setAssignmentConfig: (config) => set({ assignmentConfig: config }),
  reset: () => set({ ...initialState }),
}));
