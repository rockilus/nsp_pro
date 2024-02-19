import React, { Dispatch, SetStateAction, useState } from "react";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

import { ShiftPropertyT, ShiftDimensionT } from "./types";
import { useShiftStore } from "../../stores/shiftStore";

interface Props {
  shiftProperty: ShiftPropertyT;
  shiftDimension: ShiftDimensionT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function ShiftPropertyCell({
  shiftProperty,
  shiftDimension,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState(shiftProperty.value);

  const updateShiftProperty = useShiftStore(
    (state) => state.updateShiftProperty
  );

  const handleEditConfirm = async () => {
    if (valueState !== shiftProperty.value) {
      updateShiftProperty({ ...shiftProperty, value: valueState });
    }
    setEditing({});
  };

  const handleToggle = () => {
    updateShiftProperty({ ...shiftProperty, value: !shiftProperty.value });
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shiftProperty.value);
  };

  const selectField = () => (
    <Box sx={{ minWidth: 120, width: "100%" }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Select Option</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={valueState}
          label="Property Type"
          onChange={(e) => setValueState(e.target.value)}
          onBlur={handleEditConfirm}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleEditConfirm();
            } else if (e.key === "Escape") {
              handleEditCancel();
            }
          }}
        >
          {shiftDimension.entryOptions.map((item, index) => (
            <MenuItem value={item} key={index}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

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
        {editing && shiftDimension.entryType !== "bool" ? (
          shiftDimension.entryType === "list" ? (
            selectField()
          ) : shiftDimension.entryType === "int" ? (
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
