'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../app/i18n/client';
// Mobile
import { useIsMobile } from '../../hooks/useIsMobile';
import MobileWorkerTab from './mobile/mobile-worker-tab';
// Components
import WorkerTable from './worker-table';
import TableFilterBar from '../table/TableFilterBar';
import TableAddButton from '../buttons/table-add-button';
import DimensionDialog from '../shift-worker-shared/dimension/DimensionDialog';
import NewDimensionForm from '../shift-worker-shared/dimension/new-dimension-form';
// Hooks
import { useTableState } from '../../hooks/useTableState';
import {
  useAddWorker,
  useUpdateWorker,
  useDeleteWorker,
  useGetWorkersTabData,
} from '../../hooks/useWorker';
import { useAddDimension, useUpdateDimension, useDeleteDimension } from '../../hooks/useDimension';
import { useAddSpecialty, useUpdateSpecialty, useDeleteSpecialty } from '../../hooks/useSpecialty';
import { useUpdateAttribute } from '../../hooks/useAttribute';
import { useAddDimEntry, useUpdateDimEntry, useDeleteDimEntry } from '../../hooks/useDimEntry';
// Theme
import ThemeToggle from '../theme-toggle';
// Utils
import { createWorkerColumns } from './workerColumns';
// Styles
import '../../styles/text-styles.css';
import '../../styles/tab-container-styles.css';
import '../../styles/table-styles.css';
// Types
import { WorkerT } from '../../types/worker';
import { DimensionT, DimensionType } from '../../types/dimension';
import { DimEntryT } from '@/types/dim-entry';
import { AttributeT } from '../../types/attribute';
import { SpecialtyT } from '@/types/specialty';

dayjs.extend(utc);

// Hook for dynamic height calculation
const useTableHeight = (isFilterToolbarActive: boolean) => {
  const [tableHeight, setTableHeight] = React.useState('70vh');

  React.useEffect(() => {
    const calculateHeight = () => {
      // Calculate available height based on viewport and other elements
      const viewportHeight = window.innerHeight;
      const headerHeight = 65; // Header height (64px + 1px border)
      const titleContainerHeight = 47; // Title container 35 height and 12 margin bottom
      const filterToolbarHeight = isFilterToolbarActive ? 80 : 0; // Filter toolbar height (35px + 6px padding + 1px border)
      const paddingAndMargins = 40; // Padding 20px top, 20 bottom

      const availableHeight =
        viewportHeight -
        headerHeight -
        titleContainerHeight -
        filterToolbarHeight -
        paddingAndMargins;
      const maxHeight = Math.max(300, Math.min(availableHeight, viewportHeight));

      setTableHeight(`${maxHeight}px`);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => window.removeEventListener('resize', calculateHeight);
  }, [isFilterToolbarActive]);

  return tableHeight;
};

export default function WorkerTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, 'worker-page');

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [dimensions, setDimensions] = useState<DimensionT[]>([]);
  const [dimEntries, setDimEntries] = useState<DimEntryT[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  // Worker hooks
  const addWorkerFn = useAddWorker();
  const updateWorkerFn = useUpdateWorker();
  const deleteWorkerFn = useDeleteWorker();
  const getWorkersTabDataFn = useGetWorkersTabData();

  // Dimension hooks
  const addDimensionFn = useAddDimension();
  const updateDimensionFn = useUpdateDimension();
  const deleteDimensionFn = useDeleteDimension();

  // Specialty hooks
  const addSpecialtyFn = useAddSpecialty();
  const updateSpecialtyFn = useUpdateSpecialty();
  const deleteSpecialtyFn = useDeleteSpecialty();

  // Attribute hooks
  const updateAttributeFn = useUpdateAttribute();

  // DimEntry hooks
  const addDimEntryFn = useAddDimEntry();
  const updateDimEntryFn = useUpdateDimEntry();
  const deleteDimEntryFn = useDeleteDimEntry();

  // Worker column definitions for filtering/sorting
  const workerColumns = useMemo(() => {
    return createWorkerColumns(t, specialties, dimensions, dimEntries, workers);
  }, [t, specialties, dimensions, dimEntries, workers]);

  // Table state for worker filtering and sorting
  const {
    tableState,
    filteredAndSortedData: filteredWorkers,
    addFilter,
    removeFilter,
    updateSort,
    resetAll,
  } = useTableState(workers, workerColumns, 'nsp-pro-worker-table-state');

  // Show filter toolbar when filters/sorting is applied
  const showFilterToolbar = tableState.filters.length > 0 || tableState.sort !== null;

  // Dynamic table height accounts for filter toolbar
  const tableHeight = useTableHeight(showFilterToolbar);

  // Memoize filtered dimensions for performance
  const dimensionsDisplayed = useMemo(
    () => dimensions.filter((dim) => dim.dimTypes.includes(DimensionType.WORKER)),
    [dimensions],
  );

  const DefaultWorkerFields: Record<string, string>[] = [
    { name: 'name', label: t('name'), tooltip: t('name_tooltip') },
    { name: 'acronym', label: t('acronym'), tooltip: t('acronym_tooltip') },
    {
      name: 'employmentStartDate',
      label: t('employment_start_date'),
      tooltip: t('employment_start_date_tooltip'),
    },
    {
      name: 'employmentEndDate',
      label: t('employment_end_date'),
      tooltip: t('employment_end_date_tooltip'),
    },
    {
      name: 'specialties',
      label: t('specialties'),
      tooltip: t('specialties_tooltip'),
    },
    {
      name: 'weeklyHours',
      label: t('weekly_hours'),
      tooltip: t('weekly_hours_tooltip'),
    },
    {
      name: 'weeklyHoursDesired',
      label: t('weekly_hours_desired'),
      tooltip: t('weekly_hours_desired_tooltip'),
    },
    {
      name: 'dutiesPerMonth',
      label: t('duties_per_month'),
      tooltip: t('duties_per_month_tooltip'),
    },
    {
      name: 'annualLeave',
      label: t('annual_leave'),
      tooltip: t('annual_leave_tooltip'),
    },
  ];

  //////////////////////////
  // Worker Actions
  //////////////////////////

  const handleAddWorker = async () => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const addedWorker = await addWorkerFn({
      id: '',
      teamId: selectedTeamId,
      name: '',
      acronym: '',
      acronymCustom: false,
      employmentStartDate: dayjs.utc(),
      employmentEndDate: null,
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
      specialtyIds: [],
      deleted: false,
      userId: null,
      attributes: [],
    });
    setWorkers([...workers, addedWorker]);
  };

  const handleUpdateWorker = async (worker: WorkerT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedWorker = await updateWorkerFn(worker);
    setWorkers((prevWorkers) =>
      prevWorkers.map((w) => (w.id === updatedWorker.id ? updatedWorker : w)),
    );
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    await deleteWorkerFn(workerId, selectedTeamId);
    setWorkers(workers.filter((worker) => worker.id !== workerId));
  };

  //////////////////////////
  // Dimension Actions
  //////////////////////////

  const handleAddDimension = async (newDimension: DimensionT, newDimEntries: DimEntryT[]) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const {
      newDimension: newDimensionResponse,
      newDimEntries: newDimEntriesResponse,
      newAttributes: newAttributesResponse,
    } = await addDimensionFn(newDimension, newDimEntries);
    setDimensions([...dimensions, newDimensionResponse]);
    setDimEntries((prevDimEntries) => [...prevDimEntries, ...newDimEntriesResponse]);
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        const newAttributes = newAttributesResponse.filter(
          (attribute: AttributeT) => attribute.ownerId === worker.id,
        );
        return newAttributes
          ? {
              ...worker,
              attributes: [...worker.attributes, ...newAttributes],
            }
          : worker;
      }),
    );
    return true;
  };

  const handleUpdateDimension = async (dimension: DimensionT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedDimension = await updateDimensionFn(dimension);
    setDimensions((prevDimensions) =>
      prevDimensions.map((prevDim) =>
        prevDim.id === updatedDimension.id ? updatedDimension : prevDim,
      ),
    );
  };

  const handleDeleteDimension = async (dimensionId: string) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    await deleteDimensionFn(dimensionId, selectedTeamId);
    setDimensions(dimensions.filter((d) => d.id !== dimensionId));
  };

  //////////////////////////
  // DimEntry Actions
  //////////////////////////

  const handleAddDimEntry = async (dimEntry: DimEntryT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const newDimEntry = await addDimEntryFn(dimEntry, selectedTeamId);
    setDimEntries([...dimEntries, newDimEntry]);
  };

  const handleUpdateDimEntry = async (dimEntry: DimEntryT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedDimEntry = await updateDimEntryFn(dimEntry, selectedTeamId);
    setDimEntries((prevDimEntries) =>
      prevDimEntries.map((de) => (de.id === updatedDimEntry.id ? updatedDimEntry : de)),
    );
  };

  const handleDeleteDimEntry = async (dimEntryId: string) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedAttributes = await deleteDimEntryFn(dimEntryId, selectedTeamId);
    setDimEntries(dimEntries.filter((dimEntry) => dimEntry.id !== dimEntryId));
    for (const updatedAttribute of updatedAttributes) {
      setWorkers((prevWorker) =>
        prevWorker.map((worker) =>
          worker.id === updatedAttribute.ownerId
            ? {
                ...worker,
                attributes: worker.attributes.some(
                  (attribute) => attribute.id === updatedAttribute.id,
                )
                  ? worker.attributes.map((attribute) =>
                      attribute.id === updatedAttribute.id
                        ? { ...attribute, ...updatedAttribute }
                        : attribute,
                    )
                  : [...worker.attributes, updatedAttribute],
              }
            : worker,
        ),
      );
    }
  };

  //////////////////////////
  // Attribute Actions
  //////////////////////////

  const handleUpdateAttribute = async (attribute: AttributeT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedAttribute = await updateAttributeFn(attribute, selectedTeamId);
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) =>
        worker.id === updatedAttribute.ownerId
          ? {
              ...worker,
              attributes: worker.attributes.some(
                (attribute) => attribute.id === updatedAttribute.id,
              )
                ? worker.attributes.map((attribute) =>
                    attribute.id === updatedAttribute.id
                      ? { ...attribute, ...updatedAttribute }
                      : attribute,
                  )
                : [...worker.attributes, updatedAttribute],
            }
          : worker,
      ),
    );
  };

  //////////////////////////
  // Specialty Actions
  //////////////////////////

  const handleAddSpecialty = async (specialty: SpecialtyT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const newSpecialty = await addSpecialtyFn(specialty, selectedTeamId);
    setSpecialties([...specialties, newSpecialty]);
  };

  const handleUpdateSpecialty = async (specialty: SpecialtyT) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedSpecialty = await updateSpecialtyFn(specialty, selectedTeamId);
    setSpecialties((prevSpecialties) =>
      prevSpecialties.map((de) => (de.id === updatedSpecialty.id ? updatedSpecialty : de)),
    );
  };

  const handleDeleteSpecialty = async (specialtyId: string) => {
    if (!selectedTeamId) {
      throw new Error('Team not selected');
    }
    const updatedWorkers = await deleteSpecialtyFn(specialtyId, selectedTeamId);
    setSpecialties(specialties.filter((specialty) => specialty.id !== specialtyId));

    // If backend did not return any updated workers, fall back to an
    // optimistic local update: remove the specialtyId from each worker's
    // specialtyIds array. Otherwise, merge returned updates.
    if (!updatedWorkers || updatedWorkers.length === 0) {
      setWorkers((prevWorkers) =>
        prevWorkers.map((worker) =>
          worker.specialtyIds && worker.specialtyIds.length > 0
            ? {
                ...worker,
                specialtyIds: worker.specialtyIds.filter((id) => id !== specialtyId),
              }
            : worker,
        ),
      );
      return;
    }

    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        const updatedWorker = updatedWorkers.find((w: WorkerT) => w.id === worker.id);
        return updatedWorker ? updatedWorker : worker;
      }),
    );
  };

  useEffect(() => {
    const fetchWorkersTabData = async () => {
      if (selectedTeamId) {
        try {
          const {
            workers: fetchedWorkers,
            dimensions: fetchedDimensions,
            dimEntries: fetchedDimEntries,
            specialties: fetchedSpecialties,
          } = await getWorkersTabDataFn(selectedTeamId);
          setWorkers(fetchedWorkers);
          setDimensions(fetchedDimensions);
          setDimEntries(fetchedDimEntries);
          setSpecialties(fetchedSpecialties);
        } catch (error) {
          console.error('Failed to fetch workers tab data:', error);
        }
      }
    };
    fetchWorkersTabData();
  }, [selectedTeamId, getWorkersTabDataFn]);

  // useEffect(() => {
  //   const fetchAccessTokenPayload = async () => {
  //     try {
  //       const payload = await Session.getAccessTokenPayloadSecurely();
  //       console.log("Access token payload:", payload);

  //       // setAccessTokenPayload(payload);
  //     } catch (error) {
  //       console.error("Failed to get access token payload:", error);
  //     }
  //   };

  //   fetchAccessTokenPayload();
  // }, []);

  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileWorkerTab lng={lng} selectedTeamId={selectedTeamId} />;
  }

  return (
    <div className="tab-container-wide">
      {selectedTeamId && (
        <div>
          {/* Title container */}
          <div className="table-title-container">
            <span
              className="title"
              role="heading"
              aria-level={1}
              data-testid="workers-page-heading"
            >
              {t('team')}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ThemeToggle />
              <TableAddButton
                text={t('worker')}
                handleClick={handleAddWorker}
                tooltip={t('create_member_tooltip')}
                dataTestId="add-worker-button"
              />
              <DimensionDialog
                title={t('new_property')}
                buttonContent={
                  <TableAddButton
                    text={t('property')}
                    tooltip={t('create_property_tooltip')}
                    dataTestId="add-property-button"
                  />
                }
                content={
                  <NewDimensionForm
                    lng={lng}
                    selectedTeamId={selectedTeamId}
                    dimensionType={DimensionType.WORKER}
                    dimensions={dimensions}
                    dimEntries={dimEntries}
                    setOpenParent={setPopoverRhsOpen}
                    handleAddDimension={handleAddDimension}
                    handleUpdateDimension={handleUpdateDimension}
                  />
                }
                open={popoverRhsOpen}
                setOpen={setPopoverRhsOpen}
              />
            </div>
          </div>

          {/* Filter/Sort toolbar */}
          {showFilterToolbar && (
            <TableFilterBar
              lng={lng}
              filters={tableState.filters}
              sort={tableState.sort}
              onRemoveFilter={removeFilter}
              onRemoveSort={() => updateSort(null)}
              onResetAll={resetAll}
            />
          )}

          <WorkerTable
            lng={lng}
            selectedTeamId={selectedTeamId}
            dimensions={dimensions}
            dimEntries={dimEntries}
            workers={filteredWorkers}
            specialties={specialties}
            defaultWorkerFields={DefaultWorkerFields}
            tableHeight={tableHeight}
            // Table state props
            workerColumns={workerColumns}
            currentSort={tableState.sort}
            onSort={updateSort}
            onFilter={addFilter}
            handleAddWorker={handleAddWorker}
            handleUpdateWorker={handleUpdateWorker}
            handleDeleteWorker={handleDeleteWorker}
            handleAddDimension={handleAddDimension}
            handleUpdateDimension={handleUpdateDimension}
            handleDeleteDimension={handleDeleteDimension}
            handleAddDimEntry={handleAddDimEntry}
            handleUpdateDimEntry={handleUpdateDimEntry}
            handleDeleteDimEntry={handleDeleteDimEntry}
            handleUpdateAttribute={handleUpdateAttribute}
            handleAddSpecialty={handleAddSpecialty}
            handleUpdateSpecialty={handleUpdateSpecialty}
            handleDeleteSpecialty={handleDeleteSpecialty}
          />
        </div>
      )}
    </div>
  );
}
