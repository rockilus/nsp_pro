import React, { useCallback, useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";

import TableTemplate from "../TableTemplate/TableTemplate";

import { WorkerParamsContext } from "../../context/WorkerParamsContext";
import { WorkersContext } from "../../context/WorkersContext";

export default function WorkerConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const workerParamsContext = useContext(WorkerParamsContext);
  const workersContext = useContext(WorkersContext);

  const buildRows = useCallback(() => {
    const newRows = [];
    if (workersContext.currentWorkers) {
      for (let worker of workersContext.currentWorkers) {
        let row: Record<string, any> = {};
        for (let column of columns) {
          const property = worker["worker_properties"].find(
            (p: Record<string, any>) => p.worker_param === column._id
          );
          row[column.name] = property ? property.value || "" : "";
        }
        row["_id"] = worker["worker"]["_id"];
        newRows.push(row);
      }
      setRows(newRows);
    }
  }, [columns, workersContext?.currentWorkers]);

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

  useEffect(() => {
    async function fetchWorkers() {
      await workersContext.getWorkers();
    }
    if (!workersContext.currentWorkers) {
      fetchWorkers();
    }
    if (workersContext.currentWorkers) {
      setRows(workersContext.currentWorkers);
    }
  }, [workersContext]);

  useEffect(() => {
    if (columns.length > 0 && workersContext.currentWorkers) {
      buildRows();
    }
  }, [columns, workersContext, buildRows]);

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
    console.log("handleAddRow called: ");

    await workersContext.postCreateWorker();
  };

  const handleEditBodyCell = async (
    workerId: string,
    workerParamId: string,
    value: any
  ) => {
    console.log("handleEditCell called: ", workerId, workerParamId, value);
    await workersContext.postUpdateWorkerProperty(
      workerId,
      workerParamId,
      value
    );
  };

  const handleDeleteRow = async (workerId: string) => {
    console.log("handleDeleteRow called: ", workerId);

    await workersContext.deleteWorker(workerId);
  };

  return (
    <Box style={{ width: "100%" }}>
      <h1>Workers Configuration</h1>
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
