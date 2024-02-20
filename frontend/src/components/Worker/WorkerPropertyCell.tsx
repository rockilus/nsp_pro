import React, { Dispatch, SetStateAction, useState } from "react";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

import { WorkerPropertyT, WorkerDimensionT } from "./types";
import { useWorkerStore } from "../../stores/workerStore";

interface Props {
  workerProperty: WorkerPropertyT;
  workerDimension: WorkerDimensionT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function WorkerPropertyCell({
  workerProperty,
  workerDimension,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState(workerProperty.value);

  const updateWorkerProperty = useWorkerStore(
    (state) => state.updateWorkerProperty
  );

  const handleEditConfirm = async () => {
    if (valueState !== workerProperty.value) {
      updateWorkerProperty({ ...workerProperty, value: valueState });
    }
    setEditing({});
  };

  const handleToggle = () => {
    updateWorkerProperty({ ...workerProperty, value: !workerProperty.value });
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(workerProperty.value);
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
          {workerDimension.entryOptions.map((item, index) => (
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
        key={workerDimension.id}
        component="th"
        scope="row"
        onClick={() =>
          setEditing({ [workerProperty.workerId]: workerDimension.id })
        }
      >
        {editing && workerDimension.entryType !== "bool" ? (
          workerDimension.entryType === "list" ? (
            selectField()
          ) : workerDimension.entryType === "int" ? (
            <TextField
              fullWidth
              type="number"
              name={workerDimension.name}
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
              name={workerDimension.name}
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
        ) : workerDimension.entryType === "bool" ? (
          <Checkbox
            checked={
              typeof workerProperty.value === "boolean"
                ? workerProperty.value
                : workerProperty.value === 1
            }
            onClick={handleToggle}
          />
        ) : (
          workerProperty.value
        )}
      </TableCell>
    </>
  );
}
