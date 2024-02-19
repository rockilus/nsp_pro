export type FixedAssignmentT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  status: string; // pending, approved, rejected, disabled
};

export type RequestT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  priority: string;
  status: string;
};

export type FarT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  priority: string;
  isFA: boolean;
  status: string;
};
