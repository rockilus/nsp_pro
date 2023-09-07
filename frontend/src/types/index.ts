//==============================================================================
// Items
//==============================================================================

export interface WorkerParam {
  _id: string;
  name: string;
  label: string;
  entry_type: string;
  entry_options: string[];
}

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
  currentWorkerParams: WorkerParam[] | null;
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
