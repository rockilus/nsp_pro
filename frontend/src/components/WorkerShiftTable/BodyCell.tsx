import React, { Dispatch, SetStateAction, useState } from "react";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

import { ColumnT, CellT } from "./types";

interface Props {
  cell: CellT;
  column: ColumnT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleEditCell: (updatedCell: CellT, defaultColumn: boolean) => void;
}

export default function BodyCell({
  cell,
  column,
  editing,
  setEditing,
  handleEditCell,
}: Props) {
  const [valueState, setValueState] = useState(cell.value);

  const handleEditConfirm = async () => {
    if (valueState !== cell.value) {
      const updatedCell = { ...cell, value: valueState };
      await handleEditCell(updatedCell, column.defaultColumn);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(cell.value);
  };

  const selectFieldBool = () => (
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
          <MenuItem value={"True"}>True</MenuItem>
          <MenuItem value={"False"}>False</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

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
          {column.entryOptions.map((item, index) => (
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
        key={column.id}
        component="th"
        scope="row"
        onClick={() => setEditing({ [cell.rowId]: column.id })}
      >
        {editing ? (
          column.entryType === "list" ? (
            selectField()
          ) : column.entryType === "bool" ? (
            selectFieldBool()
          ) : column.entryType === "int" ? (
            <TextField
              fullWidth
              type="number"
              name={column.name}
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
              name={column.name}
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
        ) : (
          cell.value
        )}
      </TableCell>
    </>
  );
}
