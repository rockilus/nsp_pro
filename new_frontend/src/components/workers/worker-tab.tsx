"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
// Components
import WorkerTable from "./worker-table";
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
} from "../../app/lib/workers";
// Types
import { WorkerT, WorkerDimensionT, WorkerPropertyT } from "../../types/worker";

export default function WorkerTab({
  selectedTeamId,
}: {
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation();

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [workerDimensions, setWorkerDimensions] = useState<WorkerDimensionT[]>(
    []
  );

  const DefaultWorkerFields: Record<string, string>[] = [
    { name: "name", label: t("common.name") },
  ];

  const handleAddWorker = async () => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const addedWorker = await addWorker({
      id: "",
      teamId: selectedTeamId,
      name: "",
      workerProperties: [],
    });
    setWorkers([...workers, addedWorker]);
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteWorker(workerId, selectedTeamId);
    setWorkers(workers.filter((worker) => worker.id !== workerId));
  };

  const handleAddWorkerDimension = async (
    newWorkerDimension: WorkerDimensionT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const addedWorkerDimension = await addWorkerDimension(newWorkerDimension);
    setWorkerDimensions([...workerDimensions, addedWorkerDimension]);
    return true;
  };

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

  const handleUpdateWorker = async (worker: WorkerT) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const updatedWorker = await updateWorker(worker);
    setWorkers((prevWorkers) =>
      prevWorkers.map((w) => (w.id === updatedWorker.id ? updatedWorker : w))
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

  useEffect(() => {
    const fetchWorkersTabData = async () => {
      if (selectedTeamId) {
        const {
          workers: fetchedWorkers,
          workerDimensions: fetchedWorkerDimensions,
        }: { workers: WorkerT[]; workerDimensions: WorkerDimensionT[] } =
          await getWorkersTabData(selectedTeamId);
        setWorkers(fetchedWorkers);
        setWorkerDimensions(fetchedWorkerDimensions);
      }
    };
    fetchWorkersTabData();
  }, [selectedTeamId]);

  return (
    // <div>
    //   <p>This is worker tab</p>
    //   <p>{`Workers ${workers}`}</p>
    //   <p>{`Worker Dimensions ${workerDimensions}`}</p>
    // </div>
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <WorkerTable
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
    </Box>
  );
}
