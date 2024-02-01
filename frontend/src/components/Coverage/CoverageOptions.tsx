import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

import CoverageList from "./CoverageList";
import { CoverageT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";

dayjs.extend(utc);

interface Props {
  coverages: CoverageT[];
  selectedCoverage: CoverageT | undefined;
  editingName: boolean;
  shifts: ShiftIdNameT[];
  handleSelectCoverage: (coverage: CoverageT) => void;
  setEditingName: (editingName: boolean) => void;
  handleAddCoverage: () => void;
  handleUpdateCoverage: (updatedCoverage: CoverageT) => void;
  handleDeleteCoverage: (coverageId: string) => void;
}

export default function CoverageOptions({
  coverages,
  selectedCoverage,
  editingName,
  shifts,
  handleSelectCoverage,
  setEditingName,
  handleAddCoverage,
  handleUpdateCoverage,
  handleDeleteCoverage,
}: Props) {
  const newSDButton = () => {
    return (
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        disabled={selectedCoverage === undefined}
      >
        Create
      </Button>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "grey.100",
        minWidth: 200,
      }}
    >
      <Typography variant="subtitle1" align="left">
        Coverages
      </Typography>
      <CoverageList
        coverages={coverages}
        selectedCoverage={selectedCoverage}
        editingName={editingName}
        handleSelectCoverage={handleSelectCoverage}
        setEditingName={setEditingName}
        handleAddCoverage={handleAddCoverage}
        handleUpdateCoverage={handleUpdateCoverage}
        handleDeleteCoverage={handleDeleteCoverage}
      />
      <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <Typography variant="body2" align="left">
          Coverage options
        </Typography>
      </Box>
    </Box>
  );
}
