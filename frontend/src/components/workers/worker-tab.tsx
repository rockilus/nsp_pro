"use client";

import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Components
import WorkerTable from "./worker-table";
import TableFilterBar from "../table/TableFilterBar";
import TableAddButton from "../buttons/table-add-button";
import PopoverRHS from "../inputs/popover-rhs";
import NewDimensionForm from "../shift-worker-shared/dimension/new-dimension-form";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Actions
import {
  getWorkersTabData,
  addWorker,
  deleteWorker,
  updateWorker,
} from "../../app/lib/worker";
import {
  addDimension,
  updateDimension,
  deleteDimension,
} from "../../app/lib/dimension";
import {
  addDimEntry,
  updateDimEntry,
  deleteDimEntry,
} from "../../app/lib/dim-entry";
import { updateAttribute } from "../../app/lib/attribute";
import {
  addSpecialty,
  updateSpecialty,
  deleteSpecialty,
} from "../../app/lib/specialty";
// Hooks
import { useTableState } from "../../hooks/useTableState";
// Utils
import { createWorkerColumns } from "./workerColumns";
// Styles
import "../../styles/text-styles.css";
import "../../styles/tab-container-styles.css";
// Types
import { WorkerT } from "../../types/worker";
import { DimensionT, DimensionType } from "../../types/dimension";
import { DimEntryT } from "@/types/dim-entry";
import { AttributeT } from "../../types/attribute";
import { SpecialtyT } from "@/types/specialty";
import { log } from "console";

dayjs.extend(utc);

export default function WorkerTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [dimensions, setDimensions] = useState<DimensionT[]>([]);
  const [dimEntries, setDimEntries] = useState<DimEntryT[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  // Worker column definitions for filtering/sorting
  const workerColumns = useMemo(() => {
    return createWorkerColumns(t, specialties, dimensions, dimEntries);
  }, [t, specialties, dimensions, dimEntries]);

  // Table state for worker filtering and sorting
  const {
    tableState,
    filteredAndSortedData: filteredWorkers,
    addFilter,
    removeFilter,
    updateSort,
    resetAll,
  } = useTableState(workers, workerColumns, "nsp-pro-worker-table-state");

  // Memoize filtered dimensions for performance
  const dimensionsDisplayed = useMemo(
    () =>
      dimensions.filter((dim) => dim.dimTypes.includes(DimensionType.WORKER)),
    [dimensions]
  );

  const DefaultWorkerFields: Record<string, string>[] = [
    { name: "name", label: t("name") },
    { name: "acronym", label: t("acronym") },
    { name: "employmentStartDate", label: t("employment_start_date") },
    { name: "employmentEndDate", label: t("employment_end_date") },
    { name: "specialties", label: t("specialties") },
    { name: "weeklyHours", label: t("weekly_hours") },
    { name: "weeklyHoursDesired", label: t("weekly_hours_desired") },
    { name: "dutiesPerMonth", label: t("duties_per_month") },
    { name: "annualLeave", label: t("annual_leave") },
  ];

  //////////////////////////
  // Worker Actions
  //////////////////////////

  const handleAddWorker = async () => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const addedWorker = await addWorker({
      id: "",
      teamId: selectedTeamId,
      name: "",
      acronym: "",
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
      throw new Error("Team not selected");
    }
    const updatedWorker = await updateWorker(worker);
    setWorkers((prevWorkers) =>
      prevWorkers.map((w) => (w.id === updatedWorker.id ? updatedWorker : w))
    );
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteWorker(workerId, selectedTeamId);
    setWorkers(workers.filter((worker) => worker.id !== workerId));
  };

  //////////////////////////
  // Dimension Actions
  //////////////////////////

  const handleAddDimension = async (
    newDimension: DimensionT,
    newDimEntries: DimEntryT[]
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const {
      newDimension: newDimensionResponse,
      newDimEntries: newDimEntriesResponse,
      newAttributes: newAttributesResponse,
    } = await addDimension(newDimension, newDimEntries);
    setDimensions([...dimensions, newDimensionResponse]);
    setDimEntries((prevDimEntries) => [
      ...prevDimEntries,
      ...newDimEntriesResponse,
    ]);
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        const newAttributes = newAttributesResponse.filter(
          (attribute) => attribute.ownerId === worker.id
        );
        return newAttributes
          ? {
              ...worker,
              attributes: [...worker.attributes, ...newAttributes],
            }
          : worker;
      })
    );
    return true;
  };

  const handleUpdateDimension = async (dimension: DimensionT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedDimension = await updateDimension(dimension);
    setDimensions((prevDimensions) =>
      prevDimensions.map((prevDim) =>
        prevDim.id === updatedDimension.id ? updatedDimension : prevDim
      )
    );
  };

  const handleDeleteDimension = async (dimensionId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteDimension(dimensionId, selectedTeamId);
    setDimensions(dimensions.filter((d) => d.id !== dimensionId));
  };

  //////////////////////////
  // DimEntry Actions
  //////////////////////////

  const handleAddDimEntry = async (dimEntry: DimEntryT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newDimEntry = await addDimEntry(dimEntry, selectedTeamId);
    setDimEntries([...dimEntries, newDimEntry]);
  };

  const handleUpdateDimEntry = async (dimEntry: DimEntryT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedDimEntry = await updateDimEntry(dimEntry, selectedTeamId);
    setDimEntries((prevDimEntries) =>
      prevDimEntries.map((de) =>
        de.id === updatedDimEntry.id ? updatedDimEntry : de
      )
    );
  };

  const handleDeleteDimEntry = async (dimEntryId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedAttributes = await deleteDimEntry(dimEntryId, selectedTeamId);
    setDimEntries(dimEntries.filter((dimEntry) => dimEntry.id !== dimEntryId));
    for (const updatedAttribute of updatedAttributes) {
      setWorkers((prevWorker) =>
        prevWorker.map((worker) =>
          worker.id === updatedAttribute.ownerId
            ? {
                ...worker,
                attributes: worker.attributes.some(
                  (attribute) => attribute.id === updatedAttribute.id
                )
                  ? worker.attributes.map((attribute) =>
                      attribute.id === updatedAttribute.id
                        ? { ...attribute, ...updatedAttribute }
                        : attribute
                    )
                  : [...worker.attributes, updatedAttribute],
              }
            : worker
        )
      );
    }
  };

  //////////////////////////
  // Attribute Actions
  //////////////////////////

  const handleUpdateAttribute = async (attribute: AttributeT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedAttribute = await updateAttribute(attribute, selectedTeamId);
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) =>
        worker.id === updatedAttribute.ownerId
          ? {
              ...worker,
              attributes: worker.attributes.some(
                (attribute) => attribute.id === updatedAttribute.id
              )
                ? worker.attributes.map((attribute) =>
                    attribute.id === updatedAttribute.id
                      ? { ...attribute, ...updatedAttribute }
                      : attribute
                  )
                : [...worker.attributes, updatedAttribute],
            }
          : worker
      )
    );
  };

  //////////////////////////
  // Specialty Actions
  //////////////////////////

  const handleAddSpecialty = async (specialty: SpecialtyT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newSpecialty = await addSpecialty(specialty, selectedTeamId);
    setSpecialties([...specialties, newSpecialty]);
  };

  const handleUpdateSpecialty = async (specialty: SpecialtyT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedSpecialty = await updateSpecialty(specialty, selectedTeamId);
    setSpecialties((prevSpecialties) =>
      prevSpecialties.map((de) =>
        de.id === updatedSpecialty.id ? updatedSpecialty : de
      )
    );
  };

  const handleDeleteSpecialty = async (specialtyId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedWorkers = await deleteSpecialty(specialtyId, selectedTeamId);
    setSpecialties(
      specialties.filter((specialty) => specialty.id !== specialtyId)
    );

    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        const updatedWorker = updatedWorkers.find((w) => w.id === worker.id);
        return updatedWorker ? updatedWorker : worker;
      })
    );
  };

  useEffect(() => {
    const fetchWorkersTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          workers: fetchedWorkers,
          dimensions: fetchedDimensions,
          dimEntries: fetchedDimEntries,
          specialties: fetchedSpecialties,
        } = await getWorkersTabData(selectedTeamId);
        setWorkers(fetchedWorkers);
        setDimensions(fetchedDimensions);
        setDimEntries(fetchedDimEntries);
        setSpecialties(fetchedSpecialties);
        setIsLoading(false);
      }
    };
    fetchWorkersTabData();
  }, [selectedTeamId]);

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

  return (
    <div className="tab-container-wide">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={3} />
      ) : (
        selectedTeamId && (
          <div>
            {/* Title container */}
            <div className="title-container">
              <span className="title">{t("workers")}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <TableAddButton
                  text={t("worker")}
                  handleClick={handleAddWorker}
                />
                <PopoverRHS
                  title={t("new_property")}
                  buttonContent={<TableAddButton text={t("property")} />}
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
            {(tableState.filters.length > 0 || tableState.sort !== null) && (
              <TableFilterBar
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
        )
      )}
    </div>
  );
}
