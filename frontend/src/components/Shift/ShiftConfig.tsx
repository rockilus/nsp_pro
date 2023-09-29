import React, {
  use,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { useShiftStore } from "../../stores/shiftStore";
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";
import { ShiftPropertyT, ShiftDimensionT } from "./types";

export default function ShiftConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const shifts = useShiftStore((state) => state.shifts);
  const fetchShifts = useShiftStore((state) => state.fetchShifts);
  const addShift = useShiftStore((state) => state.addShift);
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

  const buildRows = useCallback(() => {
    const newRows = [];
    if (shifts) {
      for (let shift of shifts) {
        let row: Record<string, any> = {};
        for (let column of columns) {
          const shiftProperty = shift.shiftProperties.find(
            (p) => p.shiftDimensionId === column.id
          );
          row[column.name] = shiftProperty ? shiftProperty.value || "" : "";
        }
        row["id"] = shift.id;
        newRows.push(row);
      }
      setRows(newRows);
    }
  }, [columns, shifts]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    if (columns.length > 0 && shifts) {
      buildRows();
    }
  }, [columns, shifts, buildRows]);

  useEffect(() => {
    fetchShiftDimensions();
  }, [fetchShiftDimensions]);

  useEffect(() => {
    if (shiftDimensions) {
      setColumns(shiftDimensions);
    }
  }, [shiftDimensions]);

  // Columns

  const handleAddColumn = async (
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    const newShiftDimension: ShiftDimensionT = {
      id: "",
      name: "",
      label: label,
      entryType: entryType,
      entryOptions: entryOptions,
    };
    await addShiftDimension(newShiftDimension);
  };

  const handleEditHeadCell = async (
    shiftDimensionId: string,
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    const updatedShiftDimension: ShiftDimensionT = {
      id: shiftDimensionId,
      name: "",
      label: label,
      entryType: entryType,
      entryOptions: entryOptions,
    };
    await updateShiftDimension(updatedShiftDimension);
  };

  const handleDeleteColumn = async (shiftDimensionId: string) => {
    await deleteShiftDimension(shiftDimensionId);
  };

  // Rows

  const handleAddRow = async () => {
    await addShift();
  };

  const handleEditBodyCell = async (
    shiftId: string,
    shiftDimensionId: string,
    value: any
  ) => {
    const updatedShiftProperty: ShiftPropertyT = {
      id: "",
      value: value,
      shiftId: shiftId,
      shiftDimensionId: shiftDimensionId,
    };
    await updateShiftProperty(updatedShiftProperty);
  };

  const handleDeleteRow = async (shiftId: string) => {
    await deleteShift(shiftId);
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Shifts Configuration
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
