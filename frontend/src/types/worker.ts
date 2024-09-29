export type WorkerDimensionT = {
  id: string;
  teamId: string;
  name: string;
  entryType: string;
  entryOptions: string[];
  deleted: boolean;
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
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  deleted: boolean;
  workerProperties: WorkerPropertyT[];
};

export type NewWorkerDimensionT = {
  newDimension: WorkerDimensionT;
  newProperties: WorkerPropertyT[];
};
