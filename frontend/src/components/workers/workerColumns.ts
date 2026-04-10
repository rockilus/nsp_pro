import { ColumnDefinition } from '../../types/filter';
import { WorkerT } from '../../types/worker';
import { SpecialtyT } from '../../types/specialty';
import { DimensionT, DimensionType, DimensionEntryType } from '../../types/dimension';
import { DimEntryT } from '../../types/dim-entry';

export const createWorkerColumns = (
  t: any,
  specialties: SpecialtyT[],
  dimensions: DimensionT[],
  dimEntries: DimEntryT[],
  workers?: WorkerT[], // Optional workers data for dynamic options
): ColumnDefinition[] => {
  const baseColumns: ColumnDefinition[] = [
    {
      id: 'name',
      label: t('name'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.name,
      getDisplayValue: (worker: WorkerT) => worker.name || 'Unnamed Worker',
      getOptions: () => {
        if (!workers) return [];
        const uniqueNames = [...new Set(workers.map((w) => w.name).filter(Boolean))];
        return uniqueNames.map((name) => ({ value: name, label: name }));
      },
    },
    {
      id: 'acronym',
      label: t('acronym'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.acronym,
      getDisplayValue: (worker: WorkerT) => worker.acronym,
      getOptions: () => {
        if (!workers) return [];
        const uniqueAcronyms = [...new Set(workers.map((w) => w.acronym).filter(Boolean))];
        return uniqueAcronyms.map((acronym) => ({
          value: acronym,
          label: acronym,
        }));
      },
    },
    {
      id: 'employmentStartDate',
      label: t('employment_start_date'),
      type: 'date' as const,
      getValue: (worker: WorkerT) => worker.employmentStartDate.format('YYYY-MM-DD'),
      getDisplayValue: (worker: WorkerT) => worker.employmentStartDate.format('MMM D, YYYY'),
    },
    {
      id: 'employmentEndDate',
      label: t('employment_end_date'),
      type: 'date' as const,
      getValue: (worker: WorkerT) => worker.employmentEndDate?.format('YYYY-MM-DD') || '',
      getDisplayValue: (worker: WorkerT) =>
        worker.employmentEndDate?.format('MMM D, YYYY') || 'N/A',
    },
    {
      id: 'specialties',
      label: t('specialties'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.specialtyIds, // Return array instead of string
      getDisplayValue: (worker: WorkerT) => {
        const workerSpecialties = specialties.filter((s) => worker.specialtyIds.includes(s.id));
        return workerSpecialties.map((s) => s.name).join(', ') || 'None';
      },
      getOptions: () =>
        specialties.map((specialty) => ({
          value: specialty.id,
          label: specialty.name,
        })),
    },
    {
      id: 'weeklyHours',
      label: t('weekly_hours'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.weeklyHours.toString(),
      getDisplayValue: (worker: WorkerT) => worker.weeklyHours.toString(),
      getOptions: () => {
        if (!workers) return [];
        const uniqueValues = [...new Set(workers.map((w) => w.weeklyHours.toString()))];
        return uniqueValues.map((value) => ({ value, label: value }));
      },
    },
    {
      id: 'weeklyHoursDesired',
      label: t('weekly_hours_desired'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.weeklyHoursDesired.toString(),
      getDisplayValue: (worker: WorkerT) => worker.weeklyHoursDesired.toString(),
      getOptions: () => {
        if (!workers) return [];
        const uniqueValues = [...new Set(workers.map((w) => w.weeklyHoursDesired.toString()))];
        return uniqueValues.map((value) => ({ value, label: value }));
      },
    },
    {
      id: 'dutiesPerMonth',
      label: t('duties_per_month'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.dutiesPerMonth.toString(),
      getDisplayValue: (worker: WorkerT) => worker.dutiesPerMonth.toString(),
      getOptions: () => {
        if (!workers) return [];
        const uniqueValues = [...new Set(workers.map((w) => w.dutiesPerMonth.toString()))];
        return uniqueValues.map((value) => ({ value, label: value }));
      },
    },
    {
      id: 'annualLeave',
      label: t('annual_leave'),
      type: 'select' as const,
      getValue: (worker: WorkerT) => worker.annualLeave.toString(),
      getDisplayValue: (worker: WorkerT) => worker.annualLeave.toString(),
      getOptions: () => {
        if (!workers) return [];
        const uniqueValues = [...new Set(workers.map((w) => w.annualLeave.toString()))];
        return uniqueValues.map((value) => ({ value, label: value }));
      },
    },
  ];

  // Add dynamic dimension columns
  const dimensionColumns = dimensions
    .filter((dim) => dim.dimTypes.includes(DimensionType.WORKER))
    .map(
      (dimension): ColumnDefinition => ({
        id: `dimension_${dimension.id}`,
        label: dimension.name,
        type: dimension.entryType === DimensionEntryType.BOOL ? 'boolean' : 'select',
        getValue: (worker: WorkerT) => {
          const attribute = worker.attributes.find((a) => a.dimensionId === dimension.id);
          if (dimension.entryType === DimensionEntryType.BOOL) {
            return attribute?.value ? 'true' : 'false';
          }
          if (dimension.entryType === DimensionEntryType.DIM_ENTRIES && attribute?.dimEntryIds) {
            return attribute.dimEntryIds; // Return array instead of string
          }
          return attribute?.value?.toString() || '';
        },
        getDisplayValue: (worker: WorkerT) => {
          const attribute = worker.attributes.find((a) => a.dimensionId === dimension.id);
          if (!attribute) return 'N/A';
          if (dimension.entryType === DimensionEntryType.BOOL) {
            return attribute.value ? 'Yes' : 'No';
          }
          if (dimension.entryType === DimensionEntryType.DIM_ENTRIES && attribute.dimEntryIds) {
            const entries = dimEntries.filter((entry) => attribute.dimEntryIds?.includes(entry.id));
            return entries.map((e) => e.name).join(', ') || 'N/A';
          }
          return attribute.value?.toString() || 'N/A';
        },
        getOptions:
          dimension.entryType === DimensionEntryType.BOOL
            ? () => [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
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
                  // For STR and INT types, generate options from actual worker data
                  if (!workers) return [];
                  const uniqueValues = [
                    ...new Set(
                      workers
                        .map((worker) => {
                          const attribute = worker.attributes.find(
                            (a) => a.dimensionId === dimension.id,
                          );
                          return attribute?.value?.toString() || '';
                        })
                        .filter((value) => value !== ''),
                    ),
                  ];
                  return uniqueValues.map((value) => ({ value, label: value }));
                },
      }),
    );

  return [...baseColumns, ...dimensionColumns];
};
