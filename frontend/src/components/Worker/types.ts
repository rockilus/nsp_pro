export type WorkerDimensionT = {
  id: string;
  name: string;
  label: string;
  entryType: string;
  entryOptions: string[];
};

export type WorkerPropertyT = {
  id: string;
  value: string | number | boolean;
  workerId: string;
  workerDimensionId: string;
};

export type WorkerT = {
  id: string;
  workerProperties: WorkerPropertyT[];
};
