import { ColumnDefinition } from "../../types/filter";
import { ShiftT } from "../../types/shift";
import { DimensionT, DimensionType } from "../../types/dimension";
import { DimEntryT } from "../../types/dim-entry";
import { SpecialtyT } from "../../types/specialty";

export const createShiftColumns = (
  t: (key: string) => string,
  specialties: SpecialtyT[],
  dimensions: DimensionT[],
  dimEntries: DimEntryT[],
  shifts: ShiftT[],
  isRest: boolean
): ColumnDefinition[] => {
  const baseColumns: ColumnDefinition[] = [
    {
      id: "color",
      label: t("color"),
      type: "select" as const,
      getValue: (shift: ShiftT) => shift.color,
      getDisplayValue: (shift: ShiftT) => shift.color,
      getOptions: () => {
        const uniqueColors = [
          ...new Set(shifts.map((s) => s.color).filter(Boolean)),
        ];
        return uniqueColors.map((color) => ({ value: color, label: color }));
      },
    },
    {
      id: "name",
      label: t("name"),
      type: "select" as const,
      getValue: (shift: ShiftT) => shift.name,
      getDisplayValue: (shift: ShiftT) => shift.name || "Unnamed Shift",
      getOptions: () => {
        const uniqueNames = [
          ...new Set(shifts.map((s) => s.name).filter(Boolean)),
        ];
        return uniqueNames.map((name) => ({ value: name, label: name }));
      },
    },
    {
      id: "acronym",
      label: t("acronym"),
      type: "select" as const,
      getValue: (shift: ShiftT) => shift.acronym,
      getDisplayValue: (shift: ShiftT) => shift.acronym,
      getOptions: () => {
        const uniqueAcronyms = [
          ...new Set(shifts.map((s) => s.acronym).filter(Boolean)),
        ];
        return uniqueAcronyms.map((acronym) => ({
          value: acronym,
          label: acronym,
        }));
      },
    },
    {
      id: "start_time",
      label: t("start_time"),
      type: "text" as const,
      getValue: (shift: ShiftT) => shift.startTime.format("HH:mm"),
      getDisplayValue: (shift: ShiftT) => shift.startTime.format("HH:mm"),
    },
    {
      id: "end_time",
      label: t("end_time"),
      type: "text" as const,
      getValue: (shift: ShiftT) => shift.endTime.format("HH:mm"),
      getDisplayValue: (shift: ShiftT) => shift.endTime.format("HH:mm"),
    },
  ];

  // Add work-specific columns
  if (!isRest) {
    baseColumns.splice(
      3,
      0, // Insert after acronym
      {
        id: "duty",
        label: t("duty"),
        type: "select" as const,
        getValue: (shift: ShiftT) => shift.recuperationTime?.toString() || "0",
        getDisplayValue: (shift: ShiftT) =>
          shift.recuperationTime?.toString() || "0",
        getOptions: () => {
          const uniqueValues = [
            ...new Set(
              shifts.map((s) => s.recuperationTime?.toString() || "0")
            ),
          ];
          return uniqueValues.map((value) => ({ value, label: value }));
        },
      },
      {
        id: "recuperation",
        label: t("recuperation"),
        type: "select" as const,
        getValue: (shift: ShiftT) => shift.recuperationTime?.toString() || "0",
        getDisplayValue: (shift: ShiftT) =>
          shift.recuperationTime?.toString() || "0",
        getOptions: () => {
          const uniqueValues = [
            ...new Set(
              shifts.map((s) => s.recuperationTime?.toString() || "0")
            ),
          ];
          return uniqueValues.map((value) => ({ value, label: value }));
        },
      }
    );

    baseColumns.push({
      id: "staffing",
      label: t("staffing"),
      type: "text" as const,
      getValue: (shift: ShiftT) =>
        shift.staffing.map((s) => s.staffing).join(", "),
      getDisplayValue: (shift: ShiftT) =>
        shift.staffing.map((s) => s.staffing).join(", "),
    });
  }

  // Add dimension columns
  const dimensionColumns = dimensions
    .filter((dim) =>
      isRest
        ? dim.dimTypes.includes(DimensionType.REST_SHIFT)
        : dim.dimTypes.includes(DimensionType.SHIFT)
    )
    .map((dim) => ({
      id: `dimension_${dim.id}`,
      label: dim.name,
      type: "select" as const,
      getValue: (shift: ShiftT) => {
        const attribute = shift.attributes.find(
          (attr) => attr.dimensionId === dim.id
        );
        return attribute?.dimEntryIds?.[0] || "";
      },
      getDisplayValue: (shift: ShiftT) => {
        const attribute = shift.attributes.find(
          (attr) => attr.dimensionId === dim.id
        );
        if (!attribute || !attribute.dimEntryIds?.[0]) return "";
        const dimEntry = dimEntries.find(
          (entry) => entry.id === attribute.dimEntryIds[0]
        );
        return dimEntry?.name || "";
      },
      getOptions: () => {
        const relevantEntries = dimEntries.filter(
          (entry) => entry.dimensionId === dim.id
        );
        return relevantEntries.map((entry) => ({
          value: entry.id,
          label: entry.name,
        }));
      },
    }));

  return [...baseColumns, ...dimensionColumns];
};
