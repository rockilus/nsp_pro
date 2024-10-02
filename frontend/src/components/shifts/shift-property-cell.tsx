import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import ShiftPropertyCellList from "./shift-property-cell-list";
// Types
import {
  ShiftPropertyT,
  DimensionT,
  DimensionEntryType,
  DimEntryT,
} from "../../types/shift";

export default function ShiftPropertyCell({
  selectedTeamId,
  shiftProperty,
  shiftDimension,
  dimEntries,
  editing,
  setEditing,
  handleUpdateShiftProperty,
}: {
  selectedTeamId: string;
  shiftProperty: ShiftPropertyT;
  shiftDimension: DimensionT;
  dimEntries: DimEntryT[];
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShiftProperty: (
    shiftProperty: ShiftPropertyT,
    teamId: string
  ) => void;
}) {
  const [valueState, setValueState] = useState<
    string | number | boolean | string[]
  >(shiftProperty.value);

  const handleEditConfirm = async () => {
    if (valueState !== shiftProperty.value) {
      handleUpdateShiftProperty(
        { ...shiftProperty, value: valueState },
        selectedTeamId
      );
    }
    setEditing({});
  };

  const handleToggle = () => {
    handleUpdateShiftProperty(
      {
        ...shiftProperty,
        value: !shiftProperty.value,
      },
      selectedTeamId
    );
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shiftProperty.value);
  };

  return (
    <>
      <TableCell
        key={shiftDimension.id}
        component="th"
        scope="row"
        onClick={() =>
          setEditing({ [shiftProperty.shiftId]: shiftDimension.id })
        }
        sx={{
          paddingY: 0,
          cursor:
            shiftDimension.entryType === DimensionEntryType.DIM_ENTRIES
              ? "default"
              : "pointer",
        }}
      >
        {shiftDimension.entryType === DimensionEntryType.DIM_ENTRIES ? (
          <ShiftPropertyCellList
            selectedTeamId={selectedTeamId}
            shiftDimension={shiftDimension}
            dimEntries={dimEntries}
            shiftProperty={shiftProperty}
            handleUpdateShiftProperty={handleUpdateShiftProperty}
          />
        ) : editing && shiftDimension.entryType !== DimensionEntryType.BOOL ? (
          shiftDimension.entryType === DimensionEntryType.INT ? (
            <TextField
              fullWidth
              type="number"
              name={shiftDimension.name}
              value={valueState}
              onChange={(e) => setValueState(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditConfirm();
                } else if (e.key === "Escape") {
                  handleEditCancel();
                }
              }}
              autoFocus
            />
          ) : (
            <TextField
              fullWidth
              type="text"
              name={shiftDimension.name}
              value={valueState}
              onChange={(e) => setValueState(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEditConfirm();
                } else if (e.key === "Escape") {
                  handleEditCancel();
                }
              }}
              autoFocus
            />
          )
        ) : shiftDimension.entryType === DimensionEntryType.BOOL ? (
          <Checkbox
            checked={
              typeof shiftProperty.value === "boolean"
                ? shiftProperty.value
                : shiftProperty.value === 1
            }
            onClick={handleToggle}
          />
        ) : (
          shiftProperty.value
        )}
      </TableCell>
    </>
  );
}
