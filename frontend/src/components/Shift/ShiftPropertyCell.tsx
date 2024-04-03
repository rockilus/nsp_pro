import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import ShiftPropertyCellList from "./ShiftPropertyCellList";
// Stores
import { useShiftStore } from "../../stores/shiftStore";
// Types
import { ShiftPropertyT, ShiftDimensionT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  shiftProperty: ShiftPropertyT;
  shiftDimension: ShiftDimensionT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function ShiftPropertyCell({
  team,
  shiftProperty,
  shiftDimension,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState<
    string | number | boolean | string[]
  >(shiftProperty.value);

  const updateShiftProperty = useShiftStore(
    (state) => state.updateShiftProperty
  );

  const handleEditConfirm = async () => {
    if (valueState !== shiftProperty.value) {
      updateShiftProperty(team.id, { ...shiftProperty, value: valueState });
    }
    setEditing({});
  };

  const handleToggle = () => {
    updateShiftProperty(team.id, {
      ...shiftProperty,
      value: !shiftProperty.value,
    });
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
      >
        {shiftDimension.entryType === "list" ? (
          <ShiftPropertyCellList
            shiftDimension={shiftDimension}
            shiftProperty={shiftProperty}
          />
        ) : editing && shiftDimension.entryType !== "bool" ? (
          shiftDimension.entryType === "int" ? (
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
        ) : shiftDimension.entryType === "bool" ? (
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
