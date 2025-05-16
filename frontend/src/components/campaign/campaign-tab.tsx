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
  getCampaignTabDataNoSolver,
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
import { CoverageSelectorT } from "../../types/coverage-selector";
import { CoverageT } from "../../types/coverage";
import { ScheduleT, WorkTimeTableT } from "../../types/schedule";
import { ConstraintT } from "../../types/constraint";
import { TeamWithMembership } from "@/types/team";

export default function CampaignTab({
  lng,
  teamWithMembership,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
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
    const newSchedule = await addSchedule(teamWithMembership.team.id);
    setScheduleCampaign(newSchedule);
    const newWorkTimeTable = await getWorkTimeTable(
      newSchedule.id,
      teamWithMembership.team.id
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
    const newCoverageSelector = await addCoverageSelector(
      coverageSelector,
      teamWithMembership.team.id
    );
    setCoverageSelectors([...coverageSelectors, newCoverageSelector]);
    const newWorkTimeTable = await getWorkTimeTable(
      newCoverageSelector.scheduleId,
      teamWithMembership.team.id
    );
    setWorkTimeTable(newWorkTimeTable);
  };

  const handleUpdateCoverageSelector = async (
    coverageSelector: CoverageSelectorT
  ) => {
    const newCoverageSelector = await updateCoverageSelector(
      coverageSelector,
      teamWithMembership.team.id
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
      teamWithMembership.team.id
    );
    setWorkTimeTable(newWorkTimeTable);
  };

  const handleDeleteCoverageSelector = async (coverageSelectorId: string) => {
    await deleteCoverageSelector(
      coverageSelectorId,
      teamWithMembership.team.id
    );
    setCoverageSelectors((prevCoverageSelectors) =>
      prevCoverageSelectors.filter(
        (coverageSelector) => coverageSelector.id !== coverageSelectorId
      )
    );
    if (scheduleCampaign) {
      const newWorkTimeTable = await getWorkTimeTable(
        scheduleCampaign.id,
        teamWithMembership.team.id
      );
      setWorkTimeTable(newWorkTimeTable);
    }
  };

  useEffect(() => {
    const fetchCampaignTabData = async () => {
      setIsLoading(true);

      if (teamWithMembership.team.useSolver) {
        const {
          scheduleCampaign: fetchedScheduleCampaign,
          schedulesValidated: fetchedSchedulesValidated,
          coverages: fetchedCoverages,
          constraints: fetchedConstraints,
          coverageSelectors: fetchedCoverageSelectors,
        } = await getCampaignTabData(teamWithMembership.team.id);
        setScheduleCampaign(fetchedScheduleCampaign);
        setSchedulesValidated(fetchedSchedulesValidated);
        setCoverages(fetchedCoverages);
        setConstraints(fetchedConstraints);
        setCoverageSelectors(fetchedCoverageSelectors);
      } else {
        const {
          scheduleCampaign: fetchedScheduleCampaign,
          schedulesValidated: fetchedSchedulesValidated,
        } = await getCampaignTabDataNoSolver(teamWithMembership.team.id);
        setScheduleCampaign(fetchedScheduleCampaign);
        setSchedulesValidated(fetchedSchedulesValidated);
      }

      setIsLoading(false);
    };
    fetchCampaignTabData();
  }, [teamWithMembership]);

  useEffect(() => {
    if (scheduleCampaign && !workTimeTable) {
      const fetchWorkTimeTable = async () => {
        const newWorkTimeTable = await getWorkTimeTable(
          scheduleCampaign.id,
          teamWithMembership.team.id
        );
        setWorkTimeTable(newWorkTimeTable);
      };
      fetchWorkTimeTable();
    }
  }, [scheduleCampaign, teamWithMembership, workTimeTable]);

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
          {teamWithMembership.team.useSolver && (
            <>
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
            </>
          )}
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
