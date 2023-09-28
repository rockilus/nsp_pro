import React, { useCallback, useContext, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TableTemplate from "../TableTemplate/TableTemplate";

import { ShiftParamsContext } from "../../context/ShiftParamsContext";
import { ShiftsContext } from "../../context/ShiftsContext";

export default function ShiftConfig() {
  const [columns, setColumns] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  
  const shiftParamsContext = useContext(ShiftParamsContext);
  const shiftsContext = useContext(ShiftsContext);
  
  console.log("shiftsContext.currentShifts", shiftsContext.currentShifts);

  const buildRows = useCallback(() => {
    const newRows = [];
    if (shiftsContext.currentShifts) {
      for (let shift of shiftsContext.currentShifts) {
        let row: Record<string, any> = {};
        for (let column of columns) {
          const property = shift["shift_properties"].find(
            (p: Record<string, any>) => p.shift_param === column._id
          );
          row[column.name] = property ? property.value || "" : "";
        }
        row["_id"] = shift["shift"]["_id"];
        newRows.push(row);
      }
      setRows(newRows);
    }
  }, [columns, shiftsContext?.currentShifts]);

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

  useEffect(() => {
    async function fetchShifts() {
      await shiftsContext.getShifts();
    }
    if (!shiftsContext.currentShifts) {
      fetchShifts();
    }
    if (shiftsContext.currentShifts) {
      setRows(shiftsContext.currentShifts);
    }
  }, [shiftsContext]);

  useEffect(() => {
    if (columns.length > 0 && shiftsContext.currentShifts) {
      buildRows();
    }
  }, [columns, shiftsContext, buildRows]);

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
    console.log("handleAddRow called: ");

    await shiftsContext.postCreateShift();
  };

  const handleEditBodyCell = async (
    shiftId: string,
    shiftParamId: string,
    value: any
  ) => {
    console.log("handleEditCell called: ", shiftId, shiftParamId, value);
    await shiftsContext.postUpdateShiftProperty(shiftId, shiftParamId, value);
  };

  const handleDeleteRow = async (shiftId: string) => {
    console.log("handleDeleteRow called: ", shiftId);

    await shiftsContext.deleteShift(shiftId);
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
