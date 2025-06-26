import { ColumnDefinition } from "../../types/filter";
import { WorkerT } from "../../types/worker";
import { SpecialtyT } from "../../types/specialty";
import {
  DimensionT,
  DimensionType,
  DimensionEntryType,
} from "../../types/dimension";
import { DimEntryT } from "../../types/dim-entry";

export const createWorkerColumns = (
  t: any,
  specialties: SpecialtyT[],
  dimensions: DimensionT[],
  dimEntries: DimEntryT[]
): ColumnDefinition[] => {
  const baseColumns: ColumnDefinition[] = [
    {
      id: "name",
      label: t("name"),
      type: "text" as const,
      getValue: (worker: WorkerT) => worker.name,
      getDisplayValue: (worker: WorkerT) => worker.name || "Unnamed Worker",
    },
    {
      id: "acronym",
      label: t("acronym"),
      type: "text" as const,
      getValue: (worker: WorkerT) => worker.acronym,
      getDisplayValue: (worker: WorkerT) => worker.acronym,
    },
    {
      id: "employmentStartDate",
      label: t("employment_start_date"),
      type: "date" as const,
      getValue: (worker: WorkerT) =>
        worker.employmentStartDate.format("YYYY-MM-DD"),
      getDisplayValue: (worker: WorkerT) =>
        worker.employmentStartDate.format("MMM D, YYYY"),
    },
    {
      id: "employmentEndDate",
      label: t("employment_end_date"),
      type: "date" as const,
      getValue: (worker: WorkerT) =>
        worker.employmentEndDate?.format("YYYY-MM-DD") || "",
      getDisplayValue: (worker: WorkerT) =>
        worker.employmentEndDate?.format("MMM D, YYYY") || "N/A",
    },
    {
      id: "specialties",
      label: t("specialties"),
      type: "select" as const,
      getValue: (worker: WorkerT) => worker.specialtyIds.join(","),
      getDisplayValue: (worker: WorkerT) => {
        const workerSpecialties = specialties.filter((s) =>
          worker.specialtyIds.includes(s.id)
        );
        return workerSpecialties.map((s) => s.name).join(", ") || "None";
      },
      getOptions: () =>
        specialties.map((specialty) => ({
          value: specialty.id,
          label: specialty.name,
        })),
    },
    {
      id: "weeklyHours",
      label: t("weekly_hours"),
      type: "text" as const,
      getValue: (worker: WorkerT) => worker.weeklyHours.toString(),
      getDisplayValue: (worker: WorkerT) => worker.weeklyHours.toString(),
    },
    {
      id: "weeklyHoursDesired",
      label: t("weekly_hours_desired"),
      type: "text" as const,
      getValue: (worker: WorkerT) => worker.weeklyHoursDesired.toString(),
      getDisplayValue: (worker: WorkerT) =>
        worker.weeklyHoursDesired.toString(),
    },
    {
      id: "dutiesPerMonth",
      label: t("duties_per_month"),
      type: "text" as const,
      getValue: (worker: WorkerT) => worker.dutiesPerMonth.toString(),
      getDisplayValue: (worker: WorkerT) => worker.dutiesPerMonth.toString(),
    },
    {
      id: "annualLeave",
      label: t("annual_leave"),
      type: "text" as const,
      getValue: (worker: WorkerT) => worker.annualLeave.toString(),
      getDisplayValue: (worker: WorkerT) => worker.annualLeave.toString(),
    },
  ];

  // Add dynamic dimension columns
  const dimensionColumns = dimensions
    .filter((dim) => dim.dimTypes.includes(DimensionType.WORKER))
    .map(
      (dimension): ColumnDefinition => ({
        id: `dimension_${dimension.id}`,
        label: dimension.name,
        type:
          dimension.entryType === DimensionEntryType.BOOL
            ? "select"
            : dimension.entryType === DimensionEntryType.INT
            ? "text"
            : "text",
        getValue: (worker: WorkerT) => {
          const attribute = worker.attributes.find(
            (a) => a.dimensionId === dimension.id
          );
          if (!attribute) return "";
          if (dimension.entryType === DimensionEntryType.BOOL) {
            return attribute.value ? "true" : "false";
          }
          if (
            dimension.entryType === DimensionEntryType.DIM_ENTRIES &&
            attribute.dimEntryIds
          ) {
            return attribute.dimEntryIds.join(",");
          }
          return attribute.value?.toString() || "";
        },
        getDisplayValue: (worker: WorkerT) => {
          const attribute = worker.attributes.find(
            (a) => a.dimensionId === dimension.id
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
            : undefined,
      })
    );

  return [...baseColumns, ...dimensionColumns];
};
