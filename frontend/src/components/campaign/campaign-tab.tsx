import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import ScheduleSelector from "./schedule-selector";
import ConstraintSelector from "./constraint-selector";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// New hooks (authenticated)
import {
  useGetCampaignTabData,
  useGetCampaignTabDataNoSolver,
} from "../../hooks/useCampaign";
// Hooks
import {
  useCreateSchedule,
  useUpdateSchedule,
  useGetWorkTimeTable,
} from "../../hooks/useSchedule";
// Styles
import "../../styles/tab-container-styles.css";
// Types
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

  // Campaign hooks
  const getCampaignTabData = useGetCampaignTabData();
  const getCampaignTabDataNoSolver = useGetCampaignTabDataNoSolver();

  // Schedule hooks
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const getWorkTimeTable = useGetWorkTimeTable();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(
    null
  );
  const [schedulesValidated, setSchedulesValidated] = useState<ScheduleT[]>([]);
  const [constraints, setConstraints] = useState<ConstraintT[]>([]);
  const [workTimeTable, setWorkTimeTable] = useState<WorkTimeTableT | null>(
    null
  );

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleAddSchedule = async () => {
    try {
      const newSchedule = await createSchedule(teamWithMembership.team.id);
      setScheduleCampaign(newSchedule);
      const newWorkTimeTable = await getWorkTimeTable(
        newSchedule.id,
        teamWithMembership.team.id
      );
      setWorkTimeTable(newWorkTimeTable);
    } catch (error) {
      console.error("Failed to create schedule:", error);
      // TODO: Add user-facing error notification
    }
  };

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    try {
      const newSchedule = await updateSchedule(schedule);
      setScheduleCampaign(newSchedule);
      const newWorkTimeTable = await getWorkTimeTable(
        newSchedule.id,
        newSchedule.teamId
      );
      setWorkTimeTable(newWorkTimeTable);
    } catch (error) {
      console.error("Failed to update schedule:", error);
      // TODO: Add user-facing error notification
    }
  };

  useEffect(() => {
    const fetchCampaignTabData = async () => {
      setIsLoading(true);

      try {
        if (teamWithMembership.team.useSolver) {
          const data = await getCampaignTabData(teamWithMembership.team.id);
          setScheduleCampaign(data.scheduleCampaign);
          setSchedulesValidated(data.schedulesValidated);
          setConstraints(data.constraints);
        } else {
          const data = await getCampaignTabDataNoSolver(
            teamWithMembership.team.id
          );
          setScheduleCampaign(data.scheduleCampaign);
          setSchedulesValidated(data.schedulesValidated);
        }
      } catch (error) {
        console.error("Failed to fetch campaign tab data:", error);
        // TODO: Add user-facing error notification
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaignTabData();
  }, [teamWithMembership, getCampaignTabData, getCampaignTabDataNoSolver]);

  useEffect(() => {
    if (scheduleCampaign && !workTimeTable) {
      const fetchWorkTimeTable = async () => {
        try {
          const newWorkTimeTable = await getWorkTimeTable(
            scheduleCampaign.id,
            teamWithMembership.team.id
          );
          setWorkTimeTable(newWorkTimeTable);
        } catch (error) {
          console.error("Failed to fetch work time table:", error);
          // Handle error appropriately
        }
      };
      fetchWorkTimeTable();
    }
  }, [scheduleCampaign, teamWithMembership, workTimeTable, getWorkTimeTable]);

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
