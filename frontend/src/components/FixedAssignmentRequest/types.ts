export type FixedAssignmentT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
};

export type RequestT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  priority: string;
};

export type FarT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  priority: string;
  isFA: boolean;
};
