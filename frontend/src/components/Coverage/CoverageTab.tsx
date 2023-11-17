import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import CoverageCalendar from "./CoverageCalendar";
import CoverageOptions from "./CoverageOptions";

import { CoverageT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";
import { useCoverageStore } from "../../stores/coverageStore";

type Props = {
  shifts: ShiftIdNameT[];
};

export default function CoverageTab({ shifts }: Props) {
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
    fetchCoverages();
  }, [fetchCoverages]);

  // handlers for callbacks
  const handleUpdateCoverage = async (updatedCoverage: CoverageT) => {
    updateCoverage(updatedCoverage);
    setEditingName(false);
  };

  const handleAddCoverage = async () => {
    const templateCoverage: CoverageT = {
      id: `id-${Date.now()}`, // Temporary unique ID, replace with real ID from the backend if needed
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
    deleteCoverage(coverageId);
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
