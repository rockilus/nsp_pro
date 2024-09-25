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
  addWorkerDimension,
  updateWorkerProperty,
  updateWorkerDimension,
  updateWorker,
  deleteWorkerDimension,
} from "../../app/lib/worker";
// Styles
import "../../styles/text-styles.css";
import "../../styles/tab-container-styles.css";
// Types
import { WorkerT, WorkerDimensionT, WorkerPropertyT } from "../../types/worker";

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
  const [workerDimensions, setWorkerDimensions] = useState<WorkerDimensionT[]>(
    []
  );

  const DefaultWorkerFields: Record<string, string>[] = [
    { name: "name", label: t("name") },
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
      annualLeave: 25,
      deleted: false,
      workerProperties: [],
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
  // Worker Dimension Actions
  //////////////////////////

  const handleAddWorkerDimension = async (
    newWorkerDimension: WorkerDimensionT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const { newDimension, newProperties } = await addWorkerDimension(
      newWorkerDimension
    );
    setWorkerDimensions([...workerDimensions, newDimension]);
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        const newWorkerProperties = newProperties.filter(
          (property) => property.workerId === worker.id
        );

        return newWorkerProperties
          ? {
              ...worker,
              workerProperties: [
                ...worker.workerProperties,
                ...newWorkerProperties,
              ],
            }
          : worker;
      })
    );
    return true;
  };

  const handleUpdateWorkerDimension = async (
    workerDimension: WorkerDimensionT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedWorkerDimension = await updateWorkerDimension(workerDimension);
    setWorkerDimensions((prevWorkerDimensions) =>
      prevWorkerDimensions.map((workerDimension) =>
        workerDimension.id === updatedWorkerDimension.id
          ? updatedWorkerDimension
          : workerDimension
      )
    );
  };

  const handleDeleteWorkerDimension = async (workerDimensionId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteWorkerDimension(workerDimensionId, selectedTeamId);
    setWorkerDimensions(
      workerDimensions.filter(
        (workerDimension) => workerDimension.id !== workerDimensionId
      )
    );
  };
  //////////////////////////
  // Worker Property Actions
  //////////////////////////

  const handleUpdateWorkerProperty = async (
    workerProperty: WorkerPropertyT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedWorkerProperty = await updateWorkerProperty(
      workerProperty,
      selectedTeamId
    );
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) =>
        worker.id === updatedWorkerProperty.workerId
          ? {
              ...worker,
              workerProperties: worker.workerProperties.some(
                (workerProperty) =>
                  workerProperty.id === updatedWorkerProperty.id
              )
                ? worker.workerProperties.map((workerProperty) =>
                    workerProperty.id === updatedWorkerProperty.id
                      ? { ...workerProperty, ...updatedWorkerProperty }
                      : workerProperty
                  )
                : [...worker.workerProperties, updatedWorkerProperty],
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
          workerDimensions: fetchedWorkerDimensions,
        }: { workers: WorkerT[]; workerDimensions: WorkerDimensionT[] } =
          await getWorkersTabData(selectedTeamId);
        setWorkers(fetchedWorkers);
        setWorkerDimensions(fetchedWorkerDimensions);
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
            workerDimensions={workerDimensions}
            workers={workers}
            defaultWorkerFields={DefaultWorkerFields}
            handleAddWorker={handleAddWorker}
            handleDeleteWorker={handleDeleteWorker}
            handleAddWorkerDimension={handleAddWorkerDimension}
            handleUpdateWorkerProperty={handleUpdateWorkerProperty}
            handleUpdateWorkerDimension={handleUpdateWorkerDimension}
            handleUpdateWorker={handleUpdateWorker}
            handleDeleteWorkerDimension={handleDeleteWorkerDimension}
          />
        )
      )}
    </div>
  );
}
