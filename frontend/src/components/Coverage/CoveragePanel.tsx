import React, { Component, useEffect, useState } from "react";
import CoverageEditableView from "./CoverageEditableView";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { CoverageT, ShiftT } from "./types";
import { useCoverageStore } from "../../stores/coverageStore";

type CoveragePanelProps = {
  shifts: ShiftT[];
};

const CoveragePanel: React.FC<CoveragePanelProps> = ({ shifts }) => {
  // remote interactions via stores
  const coverages = useCoverageStore((state) => state.coverages);
  const fetchCoverages = useCoverageStore((state) => state.fetchCoverages);
  const addCoverage = useCoverageStore((state) => state.addCoverage);
  const updateCoverage = useCoverageStore((state) => state.updateCoverage);

  // local states via states
  const [selectedCoverage, setSelectedCoverage] = useState<
    CoverageT | undefined
  >(undefined);
  const [isNewCoverage, setIsNewCoverage] = useState<boolean>(false);
  const [newCoverage, setNewCoverage] = useState<CoverageT | undefined>(
    undefined
  );

  // Fetch coverages from the API on mount
  useEffect(() => {
    fetchCoverages();
  }, [fetchCoverages]);

  // handlers for callbacks
  const handleCoverageChange = async (updatedCoverage: CoverageT) => {
    if (isNewCoverage) {
      const newCoverage = await addCoverage(updatedCoverage);
      setSelectedCoverage(newCoverage);
      setIsNewCoverage(false); // Reset this flag after addingaddCoverage(updatedCoverage);
    } else {
      updateCoverage(updatedCoverage);
    }
  };

  const handleSelectCoverage = (coverage: CoverageT) => {
    setSelectedCoverage(coverage);
    setIsNewCoverage(false);
  };

  const handleCreateNewCoverage = () => {
    const now = new Date();
    const startOfDayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    const newCoverage: CoverageT = {
      id: `id-${Date.now()}`, // Temporary unique ID, replace with real ID from the backend if needed
      name: "",
      dateStart: startOfDayUTC,
      dateEnd: startOfDayUTC,
      shiftDemands: [],
    };
    setNewCoverage(newCoverage);
    setSelectedCoverage(newCoverage);
    setIsNewCoverage(true);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Typography variant="h4" align="left">
        Coverage Configuration
      </Typography>
      {/* Render a list of coverages */}
      <Box display="flex" flexDirection="row" gap={1}>
        <Select
          value={selectedCoverage?.id || "initial"}
          onChange={(e) => {
            const selectedId = e.target.value as string;
            const selectedCoverage = coverages.find((c) => c.id === selectedId);
            if (selectedCoverage) {
              handleSelectCoverage(selectedCoverage);
            }
          }}
          variant="outlined"
          size="small"
        >
          <MenuItem value="initial" disabled>
            Select Coverage
          </MenuItem>
          {isNewCoverage && (
            <MenuItem value={newCoverage?.id || ""}>
              {newCoverage?.name || "New Coverage"}
            </MenuItem>
          )}
          {coverages.map((coverage) => (
            <MenuItem key={coverage.id} value={coverage.id}>
              {coverage.name}
            </MenuItem>
          ))}
        </Select>

        {/* Button to add a new coverage */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateNewCoverage}
        >
          Add New Coverage
        </Button>
      </Box>

      {selectedCoverage && (
        <CoverageEditableView
          coverage={selectedCoverage}
          onChange={handleCoverageChange}
          shifts={shifts}
        />
      )}
    </Box>
  );
};

export default CoveragePanel;
