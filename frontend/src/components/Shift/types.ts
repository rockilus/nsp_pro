export type ShiftDimensionT = {
  id: string;
  name: string;
  entryType: string;
  entryOptions: string[];
};

export type ShiftPropertyT = {
  id: string;
  value: string | number | boolean;
  shiftId: string;
  shiftDimensionId: string;
};

export type ShiftT = {
  id: string;
  name: string;
  shiftProperties: ShiftPropertyT[];
};
