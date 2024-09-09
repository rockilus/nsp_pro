import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import CoverageSelector from "./coverage-selector";
import ScheduleSelector from "./schedule-selector";
import ConstraintSelector from "./constraint-selector";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
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
import { ScheduleT } from "../../types/schedule";
import { ConstraintT } from "../../types/constraint";

export default function CampaignTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "campaign-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
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
      setIsLoading(true);
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
      setIsLoading(false);
    };

    fetchCampaignTabData();
  }, [selectedTeamId]);

  return (
    <div className="campaign-tab-container">
      {isLoading ? (
        <TablesSkeleton numTables={3} numInternalRows={3} />
      ) : schedule ? (
        <div>
          <ScheduleSelector
            lng={lng}
            schedule={schedule}
            handleUpdateSchedule={handleUpdateSchedule}
          />
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
        </div>
      ) : (
        <Button
          variant="contained"
          onClick={handleAddSchedule}
          sx={{
            paddingLeft: 0.3,
            paddingRight: 1,
            margin: "8px",
            height: "35px",
            textTransform: "none",
          }}
        >
          {t("start_new_campaign")}
        </Button>
      )}
    </div>
  );
}
