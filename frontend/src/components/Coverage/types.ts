export type ShiftDemandT = {
  dayIndex: number; // from 0 to 6
  shiftId: string;
  quantity: number;
};

export type CoverageT = {
  id: string;
  name: string;
  dateStart: Date;
  dateEnd: Date;
  shiftDemands: ShiftDemandT[];
};

export type ShiftT = {
  id: string;
  name: string;
  // ... any other properties of a shift
};
