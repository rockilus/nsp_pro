export type WorkerDimensionT = {
  id: string;
  teamId: string;
  name: string;
  entryType: string;
  entryOptions: string[];
};

export type WorkerPropertyT = {
  id: string;
  value: string | number | boolean | string[];
  workerId: string;
  workerDimensionId: string;
};

export type WorkerT = {
  id: string;
  teamId: string;
  name: string;
  workerProperties: WorkerPropertyT[];
};

export type NewWorkerDimensionT = {
  newDimension: WorkerDimensionT;
  newProperties: WorkerPropertyT[];
};
