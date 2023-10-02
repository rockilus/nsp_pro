import React, { useCallback, useEffect, useState, useRef } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { useWorkerStore } from "../../stores/workerStore";
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { WorkerT, WorkerPropertyT, WorkerDimensionT } from "./types";

export default function WorkerConfig() {
  const defaultColumns = [
    {
      id: "",
      name: "Name",
      entryType: "str",
      entryOptions: [],
      defaultColumn: true,
    },
  ];
  const defaultColumnsRef = useRef(defaultColumns);

  const [columns, setColumns] = useState<Record<string, any>[]>(defaultColumns);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);
  const addWorker = useWorkerStore((state) => state.addWorker);
  const updateWorker = useWorkerStore((state) => state.updateWorker);
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
        row["Name"] = worker.name;
        for (let column of columns.filter((c) => !c.defaultColumn)) {
          const workerProperty = worker.workerProperties.find(
            (p) => p.workerDimensionId === column.id
          );
          row[column.name] = workerProperty ? workerProperty.value || "" : "";
        }
        row["id"] = worker.id;
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
      setColumns(() => {
        const newColumns = workerDimensions.map((dimension) => {
          return { ...dimension, defaultColumn: false };
        });
        return [...defaultColumnsRef.current, ...newColumns];
      });
    }
  }, [workerDimensions]);

  // Columns

  const handleAddColumn = async (
    name: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    const newWorkerDimension: WorkerDimensionT = {
      id: "",
      name: name,
      entryType: entryType,
      entryOptions: entryOptions,
    };
    await addWorkerDimension(newWorkerDimension);
  };

  const handleEditHeadCell = async (
    workerDimensionId: string,
    name: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    const updatedWorkerDimension: WorkerDimensionT = {
      id: workerDimensionId,
      name: name,
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
    value: any,
    defaultColumn: boolean
  ) => {
    console.log(workerId, workerDimensionId, value, defaultColumn);
    if (defaultColumn) {
      const updatedWorker: WorkerT = {
        id: workerId,
        name: value,
        workerProperties: [],
      };
      await updateWorker(updatedWorker);
    } else {
      const updatedWorkerProperty: WorkerPropertyT = {
        id: "",
        value: value,
        workerId: workerId,
        workerDimensionId: workerDimensionId,
      };
      await updateWorkerProperty(updatedWorkerProperty);
    }
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
