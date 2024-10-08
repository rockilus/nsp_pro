"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// Components
import WorkerTable from "./worker-table";
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
// Styles
import "../../styles/text-styles.css";
import "../../styles/tab-container-styles.css";
// Types
import { WorkerT } from "../../types/worker";
import { DimensionT, DimEntryT } from "../../types/dimension";
import { AttributeT } from "../../types/attribute";
import { SpecialtyT } from "../../types/team";

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

  const DefaultWorkerFields: Record<string, string>[] = [
    { name: "name", label: t("name") },
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
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
      specialtyIds: [],
      deleted: false,
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

  return (
    <div className="tab-container-wide">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={3} />
      ) : (
        selectedTeamId && (
          <WorkerTable
            lng={lng}
            selectedTeamId={selectedTeamId}
            dimensions={dimensions}
            dimEntries={dimEntries}
            workers={workers}
            defaultWorkerFields={DefaultWorkerFields}
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
          />
        )
      )}
    </div>
  );
}
