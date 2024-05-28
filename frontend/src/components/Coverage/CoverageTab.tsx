import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
// Components
import CoverageCalendar from "./CoverageCalendar";
import CoverageOptions from "./CoverageOptions";
// Stores
import { useCoverageStore } from "../../stores/coverageStore";
// Types
import { CoverageT } from "./types";
import { ShiftT } from "../Shift/types";
import { TeamT } from "../../containers/types";

type Props = {
  team: TeamT;
  shifts: ShiftT[];
  coverages: CoverageT[];
};

export default function CoverageTab({ team, shifts, coverages }: Props) {
  const { t } = useTranslation();

  const addCoverage = useCoverageStore((state) => state.addCoverage);
  const updateCoverage = useCoverageStore((state) => state.updateCoverage);
  const deleteCoverage = useCoverageStore((state) => state.deleteCoverage);

  const [selectedCoverage, setSelectedCoverage] = useState<
    CoverageT | undefined
  >(undefined);
  const [editingName, setEditingName] = useState<boolean>(false);

  const handleUpdateCoverage = async (updatedCoverage: CoverageT) => {
    updateCoverage(updatedCoverage);
    setEditingName(false);
  };

  const handleAddCoverage = async () => {
    const templateCoverage: CoverageT = {
      id: `id-${Date.now()}`,
      teamId: team.id,
      name: t("coverage.new_planner"),
      shiftDemands: [],
    };
    const newCoverage = await addCoverage(templateCoverage);
    if (!newCoverage) {
      return;
    }
    setSelectedCoverage(newCoverage);
    setEditingName(true);
  };

  const handleSelectCoverage = (coverage: CoverageT) => {
    setSelectedCoverage(coverage);
    setEditingName(false);
  };

  const handleDeleteCoverage = (coverageId: string) => {
    deleteCoverage(coverageId, team.id);
    setSelectedCoverage(undefined);
    setEditingName(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <CoverageOptions
          coverages={coverages}
          selectedCoverage={selectedCoverage}
          editingName={editingName}
          handleAddCoverage={handleAddCoverage}
          handleSelectCoverage={handleSelectCoverage}
          setEditingName={setEditingName}
          handleUpdateCoverage={handleUpdateCoverage}
          handleDeleteCoverage={handleDeleteCoverage}
        />
        <CoverageCalendar
          team={team}
          coverageId={selectedCoverage?.id || ""}
          shiftDemands={
            selectedCoverage
              ? coverages.find(
                  (coverage) => coverage.id === selectedCoverage.id
                )?.shiftDemands || []
              : []
          }
          shifts={shifts}
        />
      </Box>
    </Box>
  );
}
