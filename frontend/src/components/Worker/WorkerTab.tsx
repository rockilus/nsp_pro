import React, { useCallback, useEffect, useState, useRef } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import WorkerShiftTable from "../WorkerShiftTable/WorkerShiftTable";

import { useWorkerStore } from "../../stores/workerStore";
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { WorkerT, WorkerPropertyT, WorkerDimensionT } from "./types";
import { ColumnT, RowT, CellT } from "../WorkerShiftTable/types";

export default function WorkerTab() {
  const defaultColumns: ColumnT[] = [
    {
      id: "defaultColumnId",
      name: "Name",
      entryType: "str",
      entryOptions: [],
      defaultColumn: true,
    },
  ];
  const defaultColumnsRef = useRef(defaultColumns);

  const [columns, setColumns] = useState<ColumnT[]>(defaultColumns);
  const [rows, setRows] = useState<RowT[]>([]);

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

  const buildColumns = useCallback((): ColumnT[] => {
    const newColumns: ColumnT[] = workerDimensions.map((dimension) => {
      return { ...dimension, defaultColumn: false };
    });
    return [...defaultColumnsRef.current, ...newColumns];
  }, [workerDimensions]);

  const buildRows = useCallback((): RowT[] => {
    const newRows: RowT[] = [];
    for (let worker of workers) {
      let row: RowT = [];
      const newDefaultCell: CellT = {
        id: "defaultCellId",
        value: worker.name,
        columnId: "defaultColumnId",
        rowId: worker.id,
      };
      row.push(newDefaultCell);
      for (let column of columns.filter((c) => !c.defaultColumn)) {
        const workerProperty = worker.workerProperties.find(
          (p) => p.workerDimensionId === column.id
        );
        const newCell: CellT = {
          id: workerProperty ? workerProperty.id : "",
          value: workerProperty ? workerProperty.value : "",
          columnId: column.id,
          rowId: worker.id,
        };
        row.push(newCell);
      }
      newRows.push(row.slice());
    }
    return newRows;
  }, [columns, workers]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    if (columns.length > 0 && workers) {
      setRows(buildRows());
    }
  }, [columns, workers, buildRows]);

  useEffect(() => {
    fetchWorkerDimensions();
  }, [fetchWorkerDimensions]);

  useEffect(() => {
    if (workerDimensions) {
      setColumns(buildColumns());
    }
  }, [workerDimensions, buildColumns]);

  // Columns

  const handleAddColumn = async (newColumn: ColumnT) => {
    const newWorkerDimension: WorkerDimensionT = {
      id: "",
      name: newColumn.name,
      entryType: newColumn.entryType,
      entryOptions: newColumn.entryOptions,
    };
    await addWorkerDimension(newWorkerDimension);
  };

  const handleEditHeadCell = async (updatedColumn: ColumnT) => {
    const updatedWorkerDimension: WorkerDimensionT = {
      id: updatedColumn.id,
      name: updatedColumn.name,
      entryType: updatedColumn.entryType,
      entryOptions: updatedColumn.entryOptions,
    };
    await updateWorkerDimension(updatedWorkerDimension);
  };

  const handleDeleteColumn = async (columnId: string) => {
    await deleteWorkerDimension(columnId);
  };

  // Rows

  const handleAddRow = async () => {
    await addWorker();
  };

  const handleEditBodyCell = async (
    updatedCell: CellT,
    defaultColumn: boolean
  ) => {
    if (defaultColumn) {
      const updatedWorker: WorkerT = {
        id: updatedCell.rowId,
        name: updatedCell.value.toString(),
        workerProperties: [],
      };
      await updateWorker(updatedWorker);
    } else {
      const updatedWorkerProperty: WorkerPropertyT = {
        id: updatedCell.id,
        value: updatedCell.value,
        workerId: updatedCell.rowId,
        workerDimensionId: updatedCell.columnId,
      };
      await updateWorkerProperty(updatedWorkerProperty);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    await deleteWorker(rowId);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Workers Configuration
      </Typography>
      <WorkerShiftTable
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
