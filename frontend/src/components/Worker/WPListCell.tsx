import React, {
  useState,
  ChangeEvent,
  useRef,
  useEffect,
  useCallback,
} from "react";
// MUI
import Chip from "@mui/material/Chip";
import ClearIcon from "@mui/icons-material/Clear";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Components
import ListTypeCellEdit from "./ListTypeCellEdit";
import PopoverAnchorElOver from "./PopoverAnchorElOver";
// Types
import { WorkerDimensionT, WorkerPropertyT } from "./types";

interface Props {
  workerDimension: WorkerDimensionT;
  workerProperty: WorkerPropertyT;
}

export default function WPListCell({ workerDimension, workerProperty }: Props) {
  const [open, setOpen] = useState(false);
  const [valueState, setValueState] = useState<string[]>(
    workerProperty.value as string[]
  );

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddListValue = (value: string) => {
    if (workerDimension.entryType === "list" && Array.isArray(valueState)) {
      setValueState([...valueState, value]);
    } else {
      console.error("Cannot add list value to non-list property");
    }
  };

  const handleDeleteListValue = (value: string) => {
    if (workerDimension.entryType === "list" && Array.isArray(valueState)) {
      setValueState(valueState.filter((v) => v !== value));
    } else {
      console.error("Cannot remove list value from non-list property");
    }
  };

  console.log(workerProperty);

  return (
    <PopoverAnchorElOver
      buttonContent={workerProperty.value}
      //   buttonContent={<div style={{ color: "black" }}>Test</div>}
      content={
        <ListTypeCellEdit
          selectedOptions={valueState}
          options={workerDimension.entryOptions}
          handleAddListValue={handleAddListValue}
          handleDeleteListValue={handleDeleteListValue}
          handleClose={handleClose}
        />
      }
      open={open}
      setOpen={setOpen}
    />
  );
}
