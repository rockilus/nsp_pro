import { ColumnDefinition } from "../../types/filter";
import { ShiftT, ShiftType } from "../../types/shift";
import {
  DimensionT,
  DimensionType,
  DimensionEntryType,
} from "../../types/dimension";
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
      type: "select" as const,
      getValue: (shift: ShiftT) => shift.startTime.format("HH:mm"),
      getDisplayValue: (shift: ShiftT) => shift.startTime.format("HH:mm"),
      getOptions: () => {
        const uniqueTimes = [
          ...new Set(shifts.map((s) => s.startTime.format("HH:mm"))),
        ];
        return uniqueTimes.map((time) => ({ value: time, label: time }));
      },
    },
    {
      id: "end_time",
      label: t("end_time"),
      type: "select" as const,
      getValue: (shift: ShiftT) => shift.endTime.format("HH:mm"),
      getDisplayValue: (shift: ShiftT) => shift.endTime.format("HH:mm"),
      getOptions: () => {
        const uniqueTimes = [
          ...new Set(shifts.map((s) => s.endTime.format("HH:mm"))),
        ];
        return uniqueTimes.map((time) => ({ value: time, label: time }));
      },
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
        type: "boolean" as const,
        getValue: (shift: ShiftT) =>
          shift.shiftType === ShiftType.DUTY ? "true" : "false",
        getDisplayValue: (shift: ShiftT) =>
          shift.shiftType === ShiftType.DUTY ? "Yes" : "No",
        getOptions: () => [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
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
      type: "select" as const,
      getValue: (shift: ShiftT) => {
        return shift.staffing
          .map((s) => {
            if (s.specialtyId === null) {
              return `Any: ${s.staffing}`;
            }
            const specialty = specialties.find((sp) => sp.id === s.specialtyId);
            const specialtyName = specialty ? specialty.name : "General";
            return `${specialtyName}: ${s.staffing}`;
          })
          .join(", ");
      },
      getDisplayValue: (shift: ShiftT) => {
        return shift.staffing
          .map((s) => {
            if (s.specialtyId === null) {
              return `Any: ${s.staffing}`;
            }
            const specialty = specialties.find((sp) => sp.id === s.specialtyId);
            const specialtyName = specialty ? specialty.name : "General";
            return `${specialtyName}: ${s.staffing}`;
          })
          .join(", ");
      },
      getOptions: () => {
        const uniqueSpecialties = [
          ...new Set(
            shifts.flatMap((s) =>
              s.staffing.map((st) => {
                if (st.specialtyId === null) {
                  return "Any";
                }
                const specialty = specialties.find(
                  (sp) => sp.id === st.specialtyId
                );
                return specialty ? specialty.name : "General";
              })
            )
          ),
        ];
        return uniqueSpecialties.map((specialtyName) => ({
          value: specialtyName,
          label: specialtyName,
        }));
      },
    });
  }

  // Add dimension columns
  const dimensionColumns = dimensions
    .filter((dim) =>
      isRest
        ? dim.dimTypes.includes(DimensionType.REST_SHIFT)
        : dim.dimTypes.includes(DimensionType.SHIFT)
    )
    .map(
      (dimension): ColumnDefinition => ({
        id: `dimension_${dimension.id}`,
        label: dimension.name,
        type:
          dimension.entryType === DimensionEntryType.BOOL
            ? "boolean"
            : "select",
        getValue: (shift: ShiftT) => {
          const attribute = shift.attributes.find(
            (attr) => attr.dimensionId === dimension.id
          );
          if (dimension.entryType === DimensionEntryType.BOOL) {
            return attribute?.value ? "true" : "false";
          }
          if (
            dimension.entryType === DimensionEntryType.DIM_ENTRIES &&
            attribute?.dimEntryIds
          ) {
            return attribute.dimEntryIds; // Return array instead of string
          }
          return attribute?.value?.toString() || "";
        },
        getDisplayValue: (shift: ShiftT) => {
          const attribute = shift.attributes.find(
            (attr) => attr.dimensionId === dimension.id
          );
          if (!attribute) return "N/A";
          if (dimension.entryType === DimensionEntryType.BOOL) {
            return attribute.value ? "Yes" : "No";
          }
          if (
            dimension.entryType === DimensionEntryType.DIM_ENTRIES &&
            attribute.dimEntryIds
          ) {
            const entries = dimEntries.filter((entry) =>
              attribute.dimEntryIds?.includes(entry.id)
            );
            return entries.map((e) => e.name).join(", ") || "N/A";
          }
          return attribute.value?.toString() || "N/A";
        },
        getOptions:
          dimension.entryType === DimensionEntryType.BOOL
            ? () => [
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]
            : dimension.entryType === DimensionEntryType.DIM_ENTRIES
            ? () =>
                dimEntries
                  .filter((entry) => entry.dimensionId === dimension.id)
                  .map((entry) => ({
                    value: entry.id,
                    label: entry.name,
                  }))
            : () => {
                // For STR and INT types, generate options from actual shift data
                const uniqueValues = [
                  ...new Set(
                    shifts
                      .map((shift) => {
                        const attribute = shift.attributes.find(
                          (attr) => attr.dimensionId === dimension.id
                        );
                        return attribute?.value?.toString() || "";
                      })
                      .filter((value) => value !== "")
                  ),
                ];
                return uniqueValues.map((value) => ({ value, label: value }));
              },
      })
    );

  return [...baseColumns, ...dimensionColumns];
};
