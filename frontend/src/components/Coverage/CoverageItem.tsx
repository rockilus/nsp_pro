import React, { useState } from "react";
// MUI
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";

import { CoverageT } from "./types";

interface Props {
  coverage: CoverageT;
  selectedCoverage: CoverageT | undefined;
  editingName: boolean;
  handleSelectCoverage: (coverage: CoverageT) => void;
  setEditingName: (editingName: boolean) => void;
  handleUpdateCoverage: (updatedCoverage: CoverageT) => void;
  handleDeleteCoverage: (coverageId: string) => void;
}

export default function CoverageItem({
  coverage,
  selectedCoverage,
  editingName,
  handleSelectCoverage,
  setEditingName,
  handleUpdateCoverage,
  handleDeleteCoverage,
}: Props) {
  const [updatedName, setUpdatedName] = useState<string>(coverage.name);
  const isSelected: boolean = selectedCoverage?.id === coverage.id;
  const listItemStyle = { height: 28, padding: "0 0 0 10px" }; // padding top, right, bottom, left

  return (
    <ListItemButton key={coverage.id} selected={isSelected} sx={{ padding: 0 }}>
      {isSelected ? (
        editingName ? (
          <ListItem sx={listItemStyle}>
            <TextField
              value={updatedName}
              onChange={(e) => setUpdatedName(e.target.value)}
              inputProps={{
                style: {
                  padding: "0 0 0 5px", // top, right, bottom, left
                },
              }}
            />
            <ListItemIcon>
              <CheckIcon
                onClick={() =>
                  handleUpdateCoverage({ ...coverage, name: updatedName })
                }
              />
              <CloseIcon
                onClick={() => {
                  setEditingName(false);
                  setUpdatedName(coverage.name);
                }}
              />
            </ListItemIcon>
          </ListItem>
        ) : (
          <ListItem sx={listItemStyle}>
            <ListItemText primary={coverage.name} />
            <ListItemIcon>
              <EditIcon onClick={() => setEditingName(true)} />
              <DeleteIcon onClick={() => handleDeleteCoverage(coverage.id)} />
            </ListItemIcon>
          </ListItem>
        )
      ) : (
        <ListItem
          onClick={() => handleSelectCoverage(coverage)}
          sx={listItemStyle}
        >
          <ListItemText primary={coverage.name} />
        </ListItem>
      )}
    </ListItemButton>
  );
}
