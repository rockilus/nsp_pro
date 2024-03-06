import React, { useEffect, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import CoverageCalendar from "./CoverageCalendar";
import CoverageOptions from "./CoverageOptions";
// Stores
import { useCoverageStore } from "../../stores/coverageStore";
// Types
import { CoverageT } from "./types";
import { ShiftDefaultT } from "../Shift/types";
import { TeamT } from "../../containers/types";

type Props = {
  team: TeamT;
  shifts: ShiftDefaultT[];
};

export default function CoverageTab({ team, shifts }: Props) {
  // remote interactions via stores
  const coverages = useCoverageStore((state) => state.coverages);
  const fetchCoverages = useCoverageStore((state) => state.fetchCoverages);
  const addCoverage = useCoverageStore((state) => state.addCoverage);
  const updateCoverage = useCoverageStore((state) => state.updateCoverage);
  const deleteCoverage = useCoverageStore((state) => state.deleteCoverage);

  // local states via states
  const [selectedCoverage, setSelectedCoverage] = useState<
    CoverageT | undefined
  >(undefined);
  const [editingName, setEditingName] = useState<boolean>(false);

  // Fetch coverages from the API on mount
  useEffect(() => {
    fetchCoverages(team.id);
  }, [fetchCoverages, team.id]);

  // handlers for callbacks
  const handleUpdateCoverage = async (updatedCoverage: CoverageT) => {
    updateCoverage(updatedCoverage);
    setEditingName(false);
  };

  const handleAddCoverage = async () => {
    const templateCoverage: CoverageT = {
      id: `id-${Date.now()}`,
      teamId: team.id,
      name: "New coverage",
      shiftDemands: [],
    };
    const newCoverage = await addCoverage(templateCoverage);
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
      <Typography variant="h4" align="left">
        Coverage
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <CoverageOptions
          coverages={coverages}
          selectedCoverage={selectedCoverage}
          editingName={editingName}
          shifts={shifts}
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
