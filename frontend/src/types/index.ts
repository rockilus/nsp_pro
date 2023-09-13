//==============================================================================
// Items
//==============================================================================

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
