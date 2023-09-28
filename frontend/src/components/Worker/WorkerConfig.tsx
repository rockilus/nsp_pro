import React, { useCallback, useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { WorkerParamsContext } from "../../context/WorkerParamsContext";
import { useWorkerStore } from "../../stores/workerStore";
import { WorkerPropertyT } from "./types";

export default function WorkerConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const workerParamsContext = useContext(WorkerParamsContext);

  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);
  const addWorker = useWorkerStore((state) => state.addWorker);
  const updateWorkerProperty = useWorkerStore(
    (state) => state.updateWorkerProperty
  );
  const deleteWorker = useWorkerStore((state) => state.deleteWorker);

  const buildRows = useCallback(() => {
    const newRows = [];
    if (workers) {
      for (let worker of workers) {
        let row: Record<string, any> = {};
        for (let column of columns) {
          const workerProperty = worker.workerProperties.find(
            (p) => p.workerDimensionId === column._id
          );
          row[column.name] = workerProperty ? workerProperty.value || "" : "";
        }
        row["_id"] = worker.id;
        newRows.push(row);
      }
      setRows(newRows);
    }
  }, [columns, workers]);

  // workers useEffects
  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (columns.length > 0 && workers) {
      buildRows();
    }
  }, [columns, workers, buildRows]);

  // workerDimensions useEffects
  useEffect(() => {
    async function fetchWorkerParams() {
      await workerParamsContext.getWorkerParams();
    }
    if (!workerParamsContext.currentWorkerParams) {
      fetchWorkerParams();
    }
    if (workerParamsContext.currentWorkerParams) {
      setColumns(workerParamsContext.currentWorkerParams);
    }
  }, [workerParamsContext]);

  // Columns

  const handleAddColumn = async (
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    await workerParamsContext.postCreateWorkerParam(
      label,
      entryType,
      entryOptions
    );
  };

  const handleEditHeadCell = async (
    workerParamId: string,
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    console.log(
      "handleEditCell called: ",
      workerParamId,
      label,
      entryType,
      entryOptions
    );
    await workerParamsContext.postUpdateWorkerParam(
      workerParamId,
      label,
      entryType,
      entryOptions
    );
  };

  const handleDeleteColumn = async (workerParamId: string) => {
    console.log("handleDeleteColumn called: ", workerParamId);
    await workerParamsContext.deleteWorkerParam(workerParamId);
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
