import React, { useRef, useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import WorkerShiftTable from "../WorkerShiftTable/WorkerShiftTable";

import { useShiftStore } from "../../stores/shiftStore";
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";
import { ShiftT, ShiftPropertyT, ShiftDimensionT } from "./types";
import { ColumnT, RowT, CellT } from "../WorkerShiftTable/types";

export default function ShiftConfig() {
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

  const shifts = useShiftStore((state) => state.shifts);
  const fetchShifts = useShiftStore((state) => state.fetchShifts);
  const addShift = useShiftStore((state) => state.addShift);
  const updateShift = useShiftStore((state) => state.updateShift);
  const updateShiftProperty = useShiftStore(
    (state) => state.updateShiftProperty
  );
  const deleteShift = useShiftStore((state) => state.deleteShift);

  const shiftDimensions = useShiftDimensionStore(
    (state) => state.shiftDimensions
  );
  const fetchShiftDimensions = useShiftDimensionStore(
    (state) => state.fetchShiftDimensions
  );
  const addShiftDimension = useShiftDimensionStore(
    (state) => state.addShiftDimension
  );
  const updateShiftDimension = useShiftDimensionStore(
    (state) => state.updateShiftDimension
  );
  const deleteShiftDimension = useShiftDimensionStore(
    (state) => state.deleteShiftDimension
  );

  const buildColumns = useCallback((): ColumnT[] => {
    const newColumns = shiftDimensions.map((dimension) => {
      return { ...dimension, defaultColumn: false };
    });
    return [...defaultColumnsRef.current, ...newColumns];
  }, [shiftDimensions]);

  const buildRows = useCallback((): RowT[] => {
    const newRows: RowT[] = [];
    for (let shift of shifts) {
      let row: RowT = [];
      const newDefaultCell: CellT = {
        id: "defaultCellId",
        value: shift.name,
        columnId: "defaultColumnId",
        rowId: shift.id,
      };
      row.push(newDefaultCell);
      for (let column of columns.filter((c) => !c.defaultColumn)) {
        const shiftProperty = shift.shiftProperties.find(
          (p) => p.shiftDimensionId === column.id
        );
        const newCell: CellT = {
          id: shiftProperty ? shiftProperty.id : "",
          value: shiftProperty ? shiftProperty.value : "",
          columnId: column.id,
          rowId: shift.id,
        };
        row.push(newCell);
      }
      newRows.push(row.slice());
    }
    return newRows;
  }, [columns, shifts]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    if (columns.length > 0 && shifts) {
      setRows(buildRows());
    }
  }, [columns, shifts, buildRows]);

  useEffect(() => {
    fetchShiftDimensions();
  }, [fetchShiftDimensions]);

  useEffect(() => {
    if (shiftDimensions) {
      setColumns(buildColumns());
    }
  }, [shiftDimensions, buildColumns]);

  // Columns

  const handleAddColumn = async (newColumn: ColumnT) => {
    const newShiftDimension: ShiftDimensionT = {
      id: "",
      name: newColumn.name,
      entryType: newColumn.entryType,
      entryOptions: newColumn.entryOptions,
    };
    await addShiftDimension(newShiftDimension);
  };

  const handleEditHeadCell = async (updatedColumn: ColumnT) => {
    const updatedShiftDimension: ShiftDimensionT = {
      id: updatedColumn.id,
      name: updatedColumn.name,
      entryType: updatedColumn.entryType,
      entryOptions: updatedColumn.entryOptions,
    };
    await updateShiftDimension(updatedShiftDimension);
  };

  const handleDeleteColumn = async (columnId: string) => {
    await deleteShiftDimension(columnId);
  };

  // Rows

  const handleAddRow = async () => {
    await addShift();
  };

  const handleEditBodyCell = async (
    updatedCell: CellT,
    defaultColumn: boolean
  ) => {
    if (defaultColumn) {
      const updatedShift: ShiftT = {
        id: updatedCell.rowId,
        name: updatedCell.value.toString(),
        shiftProperties: [],
      };
      await updateShift(updatedShift);
    } else {
      const updatedShiftProperty: ShiftPropertyT = {
        id: "",
        value: updatedCell.value,
        shiftId: updatedCell.rowId,
        shiftDimensionId: updatedCell.columnId,
      };
      await updateShiftProperty(updatedShiftProperty);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    await deleteShift(rowId);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Shifts Configuration
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
