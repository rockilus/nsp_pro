import React, { useState, useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import CoverageSelector from "./coverage-selector";
import ScheduleSelector from "./schedule-selector";
import ConstraintSelector from "./constraint-selector";
// Actions
import {
  getCampaignTabData,
  addCoverageSelector,
  updateCoverageSelector,
  deleteCoverageSelector,
} from "../../app/lib/campaign";
import { addSchedule, updateSchedule } from "../../app/lib/schedule";
// Types
import { CoverageSelectorT } from "../../types/campaign";
import { CoverageT } from "../../types/coverage";
import { ScheduleT } from "../../types/schedule_temp";
import { ConstraintT } from "../../types/constraint";

export default function CampaignTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const [schedule, setSchedule] = useState<ScheduleT | null>(null);
  const [coverages, setCoverages] = useState<CoverageT[]>([]);
  const [constraints, setConstraints] = useState<ConstraintT[]>([]);
  const [coverageSelectors, setCoverageSelectors] = useState<
    CoverageSelectorT[]
  >([]);

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleAddSchedule = async () => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newSchedule = await addSchedule(selectedTeamId);
    setSchedule(newSchedule);
  };

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    const newSchedule = await updateSchedule(schedule);
    setSchedule(newSchedule);
  };

  //////////////////////////
  // Coverage Selector Actions
  //////////////////////////

  const handleAddCoverageSelector = async (
    coverageSelector: CoverageSelectorT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newCoverageSelector = await addCoverageSelector(
      coverageSelector,
      selectedTeamId
    );
    setCoverageSelectors([...coverageSelectors, newCoverageSelector]);
  };

  const handleUpdateCoverageSelector = async (
    coverageSelector: CoverageSelectorT
  ) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newCoverageSelector = await updateCoverageSelector(
      coverageSelector,
      selectedTeamId
    );
    setCoverageSelectors((prevCoverageSelectors) =>
      prevCoverageSelectors.map((coverageSelector) =>
        coverageSelector.id === newCoverageSelector.id
          ? newCoverageSelector
          : coverageSelector
      )
    );
  };

  const handleDeleteCoverageSelector = async (coverageSelectorId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteCoverageSelector(coverageSelectorId, selectedTeamId);
    setCoverageSelectors((prevCoverageSelectors) =>
      prevCoverageSelectors.filter(
        (coverageSelector) => coverageSelector.id !== coverageSelectorId
      )
    );
  };

  useEffect(() => {
    const fetchCampaignTabData = async () => {
      if (selectedTeamId) {
        const out: {
          schedule: ScheduleT;
          coverages: CoverageT[];
          constraints: ConstraintT[];
          coverageSelectors: CoverageSelectorT[];
        } | null = await getCampaignTabData(selectedTeamId);
        if (out) {
          const { schedule, coverages, constraints, coverageSelectors } = out;
          setSchedule(schedule);
          setCoverages(coverages);
          setConstraints(constraints);
          setCoverageSelectors(coverageSelectors);
        }
      }
    };
    fetchCampaignTabData();
  }, [selectedTeamId]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <ScheduleSelector
        lng={lng}
        schedule={schedule}
        handleAddSchedule={handleAddSchedule}
        handleUpdateSchedule={handleUpdateSchedule}
      />
      {schedule && (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <CoverageSelector
            lng={lng}
            schedule={schedule}
            coverageSelectors={coverageSelectors}
            coverages={coverages}
            handleAddCoverageSelector={handleAddCoverageSelector}
            handleUpdateCoverageSelector={handleUpdateCoverageSelector}
            handleDeleteCoverageSelector={handleDeleteCoverageSelector}
          />
          <ConstraintSelector
            lng={lng}
            schedule={schedule}
            constraints={constraints}
            handleUpdateSchedule={handleUpdateSchedule}
          />
        </Box>
      )}
    </Box>
  );
}
