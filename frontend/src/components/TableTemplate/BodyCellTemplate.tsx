import React, { Dispatch, SetStateAction, useState } from "react";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

interface Props {
  columnId: string;
  rowId: string;
  columnName: string;
  entryType: string;
  entryOptions: string[];
  value: any;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleEditCell: (rowId: string, columnId: string, value: any) => void;
}

export default function BodyCellTemplate({
  columnId,
  rowId,
  columnName,
  entryType,
  entryOptions,
  value,
  editing,
  setEditing,
  handleEditCell,
}: Props) {
  const [entryValue, setEntryValue] = useState(value);

  const handleEditConfirm = async () => {
    if (entryValue !== value) {
      await handleEditCell(rowId, columnId, entryValue);
    }
    setEditing({});
    setEntryValue(value);
  };

  const handleEditCancel = () => {
    setEditing({});
    setEntryValue(value);
  };

  const selectFieldBool = () => (
    <Box sx={{ minWidth: 120, width: "100%" }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Select Option</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={entryValue}
          label="Property Type"
          onChange={(e) => setEntryValue(e.target.value)}
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
          value={entryValue}
          label="Property Type"
          onChange={(e) => setEntryValue(e.target.value)}
          onBlur={handleEditConfirm}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleEditConfirm();
            } else if (e.key === "Escape") {
              handleEditCancel();
            }
          }}
        >
          {entryOptions.map((item, index) => (
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
        key={columnId}
        component="th"
        scope="row"
        onClick={() => setEditing({ [rowId]: columnId })}
      >
        {editing ? (
          entryType === "list" ? (
            selectField()
          ) : entryType === "bool" ? (
            selectFieldBool()
          ) : entryType === "int" ? (
            <TextField
              fullWidth
              type="number"
              name={columnName}
              value={entryValue}
              onChange={(e) => setEntryValue(e.target.value)}
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
              name={columnName}
              value={entryValue}
              onChange={(e) => setEntryValue(e.target.value)}
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
          entryValue
        )}
      </TableCell>
    </>
  );
}
