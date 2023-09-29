import React, { useCallback, useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { useWorkerStore } from "../../stores/workerStore";
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { WorkerPropertyT, WorkerDimensionT } from "./types";

export default function WorkerConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);
  const addWorker = useWorkerStore((state) => state.addWorker);
  const updateWorkerProperty = useWorkerStore(
    (state) => state.updateWorkerProperty
  );
  const deleteWorker = useWorkerStore((state) => state.deleteWorker);

  const workerDimensions = useWorkerDimensionStore(
    (state) => state.workerDimensions
  );
  const fetchWorkerDimensions = useWorkerDimensionStore(
    (state) => state.fetchWorkerDimensions
  );
  const addWorkerDimension = useWorkerDimensionStore(
    (state) => state.addWorkerDimension
  );
  const updateWorkerDimension = useWorkerDimensionStore(
    (state) => state.updateWorkerDimension
  );
  const deleteWorkerDimension = useWorkerDimensionStore(
    (state) => state.deleteWorkerDimension
  );

  const buildRows = useCallback(() => {
    const newRows = [];
    if (workers) {
      for (let worker of workers) {
        let row: Record<string, any> = {};
        for (let column of columns) {
          const workerProperty = worker.workerProperties.find(
            (p) => p.workerDimensionId === column.id
          );
          row[column.name] = workerProperty ? workerProperty.value || "" : "";
        }
        row["_id"] = worker.id;
        newRows.push(row);
      }
      setRows(newRows);
    }
  }, [columns, workers]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (columns.length > 0 && workers) {
      buildRows();
    }
  }, [columns, workers, buildRows]);

  useEffect(() => {
    fetchWorkerDimensions();
  }, [fetchWorkerDimensions]);

  useEffect(() => {
    if (workerDimensions) {
      setColumns(workerDimensions);
    }
  }, [workerDimensions]);

  // Columns

  const handleAddColumn = async (
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    const newWorkerDimension: WorkerDimensionT = {
      id: "",
      name: "",
      label: label,
      entryType: entryType,
      entryOptions: entryOptions,
    };
    await addWorkerDimension(newWorkerDimension);
  };

  const handleEditHeadCell = async (
    workerDimensionId: string,
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    const updatedWorkerDimension: WorkerDimensionT = {
      id: workerDimensionId,
      name: "",
      label: label,
      entryType: entryType,
      entryOptions: entryOptions,
    };
    await updateWorkerDimension(updatedWorkerDimension);
  };

  const handleDeleteColumn = async (workerDimensionId: string) => {
    await deleteWorkerDimension(workerDimensionId);
  };

  // Rows

  const handleAddRow = async () => {
    await addWorker();
  };

  const handleEditBodyCell = async (
    workerId: string,
    workerDimensionId: string,
    value: any
  ) => {
    const updatedWorkerProperty: WorkerPropertyT = {
      id: "",
      value: value,
      workerId: workerId,
      workerDimensionId: workerDimensionId,
    };
    await updateWorkerProperty(updatedWorkerProperty);
  };

  const handleDeleteRow = async (workerId: string) => {
    await deleteWorker(workerId);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Workers Configuration
      </Typography>
      <TableTemplate
        columns={columns}
        rows={rows}
        handleAddColumn={handleAddColumn}
        handleEditHeadCell={handleEditHeadCell}
        handleDeleteColumn={handleDeleteColumn}
        handleAddRow={handleAddRow}
        handleEditBodyCell={handleEditBodyCell}
        handleDeleteRow={handleDeleteRow}
      />
    </Box>
  );
}
