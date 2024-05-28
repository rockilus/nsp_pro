import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import CoverageList from "./CoverageList";
import TableAddButton from "../SharedComponents/TableAddButton";
// Types
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

export default function CoverageOptions({
  coverages,
  selectedCoverage,
  editingName,
  handleSelectCoverage,
  setEditingName,
  handleAddCoverage,
  handleUpdateCoverage,
  handleDeleteCoverage,
}: Props) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        backgroundColor: "grey.100",
        minWidth: 200,
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
          borderBottom: "1px solid lightgrey",
        }}
      >
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          {t("coverage.weekly_planners")}
        </Typography>
      </Box>
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
          borderTop: "1px solid lightgrey",
        }}
      >
        <TableAddButton
          text={t("common.planner")}
          handleClick={handleAddCoverage}
        />
      </Box>
    </Box>
  );
}
