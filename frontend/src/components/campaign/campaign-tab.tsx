import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import CoverageCampaignConfig from "./coverage-campaign-config";
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
import {
  addSchedule,
  updateSchedule,
  getWorkTimeTable,
} from "../../app/lib/schedule";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import { CoverageSelectorT } from "../../types/campaign";
import { CoverageT } from "../../types/coverage";
import { ScheduleT, WorkTimeTableT } from "../../types/schedule";
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
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(
    null
  );
  const [schedulesValidated, setSchedulesValidated] = useState<ScheduleT[]>([]);
  const [coverages, setCoverages] = useState<CoverageT[]>([]);
  const [constraints, setConstraints] = useState<ConstraintT[]>([]);
  const [coverageSelectors, setCoverageSelectors] = useState<
    CoverageSelectorT[]
  >([]);
  const [workTimeTable, setWorkTimeTable] = useState<WorkTimeTableT | null>(
    null
  );

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleAddSchedule = async () => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    const newSchedule = await addSchedule(selectedTeamId);
    setScheduleCampaign(newSchedule);
    const newWorkTimeTable = await getWorkTimeTable(
      newSchedule.id,
      selectedTeamId
    );
    setWorkTimeTable(newWorkTimeTable);
  };

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    const { schedule: newSchedule, coverageSelectors: newCoverageSelectors } =
      await updateSchedule(schedule);
    setScheduleCampaign(newSchedule);
    setCoverageSelectors((prevCSs) =>
      prevCSs.map((cs) => {
        const newCS = newCoverageSelectors.find((newCS) => newCS.id === cs.id);
        return newCS ? newCS : cs;
      })
    );
    const newWorkTimeTable = await getWorkTimeTable(
      newSchedule.id,
      newSchedule.teamId
    );
    setWorkTimeTable(newWorkTimeTable);
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
    const newWorkTimeTable = await getWorkTimeTable(
      newCoverageSelector.scheduleId,
      selectedTeamId
    );
    setWorkTimeTable(newWorkTimeTable);
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
    const newWorkTimeTable = await getWorkTimeTable(
      newCoverageSelector.scheduleId,
      selectedTeamId
    );
    setWorkTimeTable(newWorkTimeTable);
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
    if (scheduleCampaign) {
      const newWorkTimeTable = await getWorkTimeTable(
        scheduleCampaign.id,
        selectedTeamId
      );
      setWorkTimeTable(newWorkTimeTable);
    }
  };

  useEffect(() => {
    const fetchCampaignTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const out: {
          scheduleCampaign: ScheduleT | null;
          schedulesValidated: ScheduleT[];
          coverages: CoverageT[];
          constraints: ConstraintT[];
          coverageSelectors: CoverageSelectorT[];
        } = await getCampaignTabData(selectedTeamId);
        if (out) {
          const {
            scheduleCampaign: fetchedScheduleCampaign,
            schedulesValidated: fetchedSchedulesValidated,
            coverages: fetchedCoverages,
            constraints: fetchedConstraints,
            coverageSelectors: fetchedCoverageSelectors,
          } = out;
          setScheduleCampaign(fetchedScheduleCampaign);
          setSchedulesValidated(fetchedSchedulesValidated);
          setCoverages(fetchedCoverages);
          setConstraints(fetchedConstraints);
          setCoverageSelectors(fetchedCoverageSelectors);
        }
      }
      setIsLoading(false);
    };
    fetchCampaignTabData();
  }, [selectedTeamId]);

  useEffect(() => {
    if (scheduleCampaign && selectedTeamId && !workTimeTable) {
      const fetchWorkTimeTable = async () => {
        const newWorkTimeTable = await getWorkTimeTable(
          scheduleCampaign.id,
          selectedTeamId
        );
        setWorkTimeTable(newWorkTimeTable);
      };
      fetchWorkTimeTable();
    }
  }, [scheduleCampaign, selectedTeamId, workTimeTable]);

  return (
    <div className="tab-container">
      {isLoading ? (
        <TablesSkeleton numTables={3} numInternalRows={3} />
      ) : scheduleCampaign ? (
        <div>
          <ScheduleSelector
            lng={lng}
            scheduleCampaign={scheduleCampaign}
            schedulesValidated={schedulesValidated}
            workTimeTable={workTimeTable}
            handleUpdateSchedule={handleUpdateSchedule}
          />
          <div className="divider" />
          <CoverageCampaignConfig
            lng={lng}
            schedule={scheduleCampaign}
            coverageSelectors={coverageSelectors}
            coverages={coverages}
            handleAddCoverageSelector={handleAddCoverageSelector}
            handleUpdateCoverageSelector={handleUpdateCoverageSelector}
            handleDeleteCoverageSelector={handleDeleteCoverageSelector}
          />
          <div className="divider" />
          <ConstraintSelector
            lng={lng}
            schedule={scheduleCampaign}
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
