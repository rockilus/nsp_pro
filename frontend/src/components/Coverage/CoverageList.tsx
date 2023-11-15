import React from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import CoverageItem from "./CoverageItem";
import { CoverageT } from "./types";

interface Props {
  coverages: CoverageT[];
  selectedCoverage: CoverageT | undefined;
  editingName: boolean;
  handleSelectCoverage: (coverage: CoverageT) => void;
  setEditingName: (editingName: boolean) => void;
  handleAddCoverage: () => void;
  handleUpdateCoverage: (updatedCoverage: CoverageT) => void;

  handleDeleteCoverage: (coverageId: string) => void;
}

export default function CoverageList({
  coverages,
  selectedCoverage,
  editingName,
  handleSelectCoverage,
  setEditingName,
  handleAddCoverage,
  handleUpdateCoverage,
  handleDeleteCoverage,
}: Props) {
  return (
    <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      <List component="nav" aria-label="main mailbox folders" dense={true}>
        {coverages.map((coverage, index) => (
          <CoverageItem
            key={index}
            coverage={coverage}
            selectedCoverage={selectedCoverage}
            editingName={editingName}
            handleSelectCoverage={handleSelectCoverage}
            setEditingName={setEditingName}
            handleUpdateCoverage={handleUpdateCoverage}
            handleDeleteCoverage={handleDeleteCoverage}
          />
        ))}
        <ListItemButton sx={{ padding: 0 }}>
          <ListItem
            onClick={handleAddCoverage}
            style={{ height: 28, padding: "0 0 0 10px" }} // padding top, right, bottom, left
          >
            <AddIcon fontSize="small" sx={{ color: "grey" }} />
            <ListItemText primary="New" sx={{ color: "grey" }} />
          </ListItem>
        </ListItemButton>
      </List>
    </Box>
  );
}

{
  /* <ListItem
secondaryAction={
  <IconButton edge="end" aria-label="delete">
      <EditIcon />
    </IconButton>
  }
  > */
}
