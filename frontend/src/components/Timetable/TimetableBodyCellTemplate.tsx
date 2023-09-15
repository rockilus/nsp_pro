import React, { Dispatch, SetStateAction, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

import TimetableAddCellTemplate from "./TimetableAddCellTemplate";

interface Props {
  cellInfo: Record<string, any>;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleEditCell: (rowId: string, columnId: string, value: any) => void;
  handleAddCell: (
    value: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => void;
}

export default function TimetableBodyCellTemplate({
  cellInfo,
  editing,
  setEditing,
  handleEditCell,
  handleAddCell,
}: Props) {
  const [entryValue, setEntryValue] = useState(cellInfo?.value || "No Value");
  const [addingCell, setAddingCell] = useState(false);
  const entryOptions = ["Morning", "Afternoon", "Night"];

  const handleEditConfirm = async () => {
    // console.log("handleEdit");
    // if (entryValue !== value) {
    //   await handleEditCell(rowId, columnId, entryValue);
    // }
    // setEditing({});
    // setEntryValue(value);
  };

  const handleEditCancel = () => {
    // console.log("handleEditCancel");
    // setEditing({});
    // setEntryValue(value);
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

  // console.log("cellInfo: ", cellInfo);

  return (
    <>
      <TableCell
        key={cellInfo._id}
        component="th"
        scope="row"
        rowSpan={cellInfo?.rowSpan || 1}
        // onClick={() => setEditing({ [rowId]: columnId })}
      >
        {cellInfo._id === "addPropertyRow" ? (
          <TimetableAddCellTemplate
            cellInfo={cellInfo}
            handleAddCell={handleAddCell}
          />
        ) : editing ? (
          selectField()
        ) : (
          <TextField
            fullWidth
            type="text"
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
        )}
      </TableCell>
    </>
  );
}
