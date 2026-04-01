import { ColumnDefinition } from "../../types/filter";
import { ShiftT } from "../../types/shift";

export const createShiftColumns = (
  t: (key: string) => string,
  shifts: ShiftT[] = [],
): ColumnDefinition[] => {
  // Generate unique shift identifiers from the actual shifts data
  const uniqueShifts = shifts.map((shift) => ({
    value: shift.id,
    label: shift.name || shift.acronym,
  }));

  return [
    {
      id: "shift",
      label: t("shift"),
      type: "select" as const,
      getValue: (shift: ShiftT) => shift.id,
      getDisplayValue: (shift: ShiftT) => shift.name || shift.acronym,
      getOptions: () => uniqueShifts,
    },
  ];
};
