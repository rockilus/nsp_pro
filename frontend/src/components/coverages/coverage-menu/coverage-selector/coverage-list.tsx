import React from "react";
// MUI
import Box from "@mui/material/Box";
import List from "@mui/material/List";
// Components
import CoverageItem from "./coverage-item";
// Types
import { CoverageT } from "../../../../types/coverage";

export default function CoverageList({
  coverages,
  selectedCoverage,
  editingName,
  handleSelectCoverage,
  setEditingName,
  handleUpdateCoverage,
  handleDeleteCoverage,
}: {
  coverages: CoverageT[];
  selectedCoverage: CoverageT | null;
  editingName: boolean;
  handleSelectCoverage: (coverage: CoverageT) => void;
  setEditingName: (editingName: boolean) => void;
  handleUpdateCoverage: (updatedCoverage: CoverageT) => void;
  handleDeleteCoverage: (coverageId: string) => void;
}) {
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
      </List>
    </Box>
  );
}
