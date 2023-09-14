//==============================================================================
// Items
//==============================================================================

import { time } from "console";

// export interface WorkerParam {
//   _id: string;
//   name: string;
//   label: string;
//   entry_type: string;
//   entry_options: string[];
// }

//==============================================================================
// State
//==============================================================================

export interface WorkersState {
  currentWorkers: Record<string, any>[] | null;
  error?: string;
  postCreateWorker: () => Promise<void>;
  getWorkers: () => Promise<void>;
  postUpdateWorkerProperty: (
    workerId: string,
    workerParamId: string,
    value: string
  ) => Promise<void>;
  deleteWorker: (workerId: string) => Promise<void>;
}

export interface WorkerParamsState {
  currentWorkerParams: Record<string, any>[] | null;
  // currentWorkerParams: WorkerParam[] | null;
  error?: string;
  postCreateWorkerParam: (
    label: string,
    entry_type: string,
    entry_options: string[]
  ) => Promise<void>;
  getWorkerParams: () => Promise<void>;
  postUpdateWorkerParam: (
    workerParamId: string,
    label: string,
    entry_type: string,
    entry_options: string[]
  ) => Promise<void>;
  deleteWorkerParam: (workerParamId: string) => Promise<void>;
}

export interface ShiftsState {
  currentShifts: Record<string, any>[] | null;
  error?: string;
  postCreateShift: () => Promise<void>;
  getShifts: () => Promise<void>;
  postUpdateShiftProperty: (
    shiftId: string,
    shiftParamId: string,
    value: string
  ) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
}

export interface ShiftParamsState {
  currentShiftParams: Record<string, any>[] | null;
  error?: string;
  postCreateShiftParam: (
    label: string,
    entry_type: string,
    entry_options: string[]
  ) => Promise<void>;
  getShiftParams: () => Promise<void>;
  postUpdateShiftParam: (
    shiftParamId: string,
    label: string,
    entry_type: string,
    entry_options: string[]
  ) => Promise<void>;
  deleteShiftParam: (shiftParamId: string) => Promise<void>;
}

export interface ConstraintParamsState {
  currentConstraintParams: Record<string, any>[] | null;
  error?: string;
  getConstraintParams: () => Promise<void>;
}

export interface ConstraintsState {
  currentConstraints: Record<string, any>[] | null;
  error?: string;
  postCreateConstraint: (constraint: Record<string, any>) => Promise<void>;
  getConstraints: () => Promise<void>;
  postUpdateConstraint: (
    constraintId: string,
    constraint: Record<string, any>
  ) => Promise<void>;
  postUpdateConstraintStatus: (
    constraintId: string,
    newStatus: boolean
  ) => Promise<void>;
  deleteConstraint: (constraintId: string) => Promise<void>;
}

export interface TimetablesState {
  currentTimetables: Record<string, any>[] | null;
  error?: string;
  postCreateTimetable: () => Promise<Record<string, any>>;
  getTimetables: () => Promise<Record<string, any>>;
  deleteTimetable: (timetableId: string) => Promise<void>;
}

export interface TimetableCategoriesState {
  currentTimetableCategories: Record<string, any>[] | null;
  error?: string;
  postCreateTimetableCategory: (
    label: string,
    timetableId: string
  ) => Promise<void>;
  getTimetableCategories: () => Promise<void>;
  postUpdateTimetableCategory: (
    label: string,
    timetableCategoryId: string
  ) => Promise<void>;
  deleteTimetableCategory: (timetableCategoryId: string) => Promise<void>;
  addToTimetableCategory: (timetableCategories: Record<string, any>[]) => void;
}

export interface TimetableTimesState {
  currentTimetableTimes: Record<string, any>[] | null;
  error?: string;
  postCreateTimetableTime: (
    label: string,
    timetableId: string
  ) => Promise<void>;
  getTimetableTimes: () => Promise<void>;
  postUpdateTimetableTime: (
    label: string,
    timetableTimeId: string
  ) => Promise<void>;
  deleteTimetableTime: (timetableTimeId: string) => Promise<void>;
  addToTimetableTime: (timetableTimes: Record<string, any>[]) => void;
}

export interface TimetablePropertiesState {
  currentTimetableProperties: Record<string, any>[] | null;
  error?: string;
  postCreateTimetableProperty: (
    label: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => Promise<void>;
  getTimetableProperties: () => Promise<void>;
  postUpdateTimetableProperty: (
    label: string,
    timetablePropertyId: string
  ) => Promise<void>;
  deleteTimetableProperty: (timetablePropertyId: string) => Promise<void>;
  addToTimetableProperty: (timetableProperties: Record<string, any>[]) => void;
}
