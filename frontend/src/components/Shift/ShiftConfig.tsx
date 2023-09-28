import React, { useCallback, useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { ShiftParamsContext } from "../../context/ShiftParamsContext";
import { useShiftStore } from "../../stores/shiftStore";
import { ShiftPropertyT } from "./types";

export default function ShiftConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const shiftParamsContext = useContext(ShiftParamsContext);

  const shifts = useShiftStore((state) => state.shifts);
  const fetchShifts = useShiftStore((state) => state.fetchShifts);
  const addShift = useShiftStore((state) => state.addShift);
  const updateShiftProperty = useShiftStore(
    (state) => state.updateShiftProperty
  );
  const deleteShift = useShiftStore((state) => state.deleteShift);

  const buildRows = useCallback(() => {
    const newRows = [];
    if (shifts) {
      for (let shift of shifts) {
        let row: Record<string, any> = {};
        for (let column of columns) {
          const shiftProperty = shift.shiftProperties.find(
            (p) => p.shiftDimensionId === column._id
          );
          row[column.name] = shiftProperty ? shiftProperty.value || "" : "";
        }
        row["_id"] = shift.id;
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
    async function fetchShiftParams() {
      await shiftParamsContext.getShiftParams();
    }
    if (!shiftParamsContext.currentShiftParams) {
      fetchShiftParams();
    }
    if (shiftParamsContext.currentShiftParams) {
      setColumns(shiftParamsContext.currentShiftParams);
    }
  }, [shiftParamsContext]);

  // Columns

  const handleAddColumn = async (
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    await shiftParamsContext.postCreateShiftParam(
      label,
      entryType,
      entryOptions
    );
  };

  const handleEditHeadCell = async (
    shiftParamId: string,
    label: string,
    entryType: string,
    entryOptions: string[]
  ) => {
    console.log(
      "handleEditCell called: ",
      shiftParamId,
      label,
      entryType,
      entryOptions
    );
    await shiftParamsContext.postUpdateShiftParam(
      shiftParamId,
      label,
      entryType,
      entryOptions
    );
  };

  const handleDeleteColumn = async (shiftParamId: string) => {
    console.log("handleDeleteColumn called: ", shiftParamId);
    await shiftParamsContext.deleteShiftParam(shiftParamId);
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
