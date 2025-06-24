import React, { useState, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import ScheduleDisplay from "./table/schedule-display";
import ScheduleNavBar from "./nav-bar/schedule-nav-bar";
import { getPeriodStartEndDates } from "./schedule-utils";
// Skeletons
import ScheduleTableSkeleton from "../skeletons/schedule-table-skeleton";
// Actions
import { getScheduleAssignmentsDataMember } from "../../app/lib/schedule";
import { exportSchedule } from "../../app/lib/export-schedule";
// Styles
import "../../styles/tab-container-styles.css";
import "./schedule-tab.css";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import {
  ExportOptionsT,
  periodDateT,
  DuplicateRequestT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from "../../types/schedule";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT, CreateAssignmentT } from "@/types/assignment";
import { TeamWithMembership } from "@/types/team";

dayjs.extend(utc);
dayjs.extend(isoWeek);

export default function ScheduleTabMember({
  lng,
  teamWithMembership,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [isLoadingAssignments, setIsLoadingAssignments] =
    useState<boolean>(true);

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [assignments, setAssignments] = useState<AssignmentT[]>([]);

  const [scheduleViewSettings, setScheduleViewSettings] =
    useState<ScheduleViewSettingsT>({
      timeFrame: "week",
      groupBy: "shift",
      showBreaches: true,
      showAssignments: true,
      showDailyShiftDemands: true,
      showRequests: true,
    });

  const buildDates = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      const dates: periodDateT[] = [];
      let currentDate = startDate;

      while (currentDate.isBefore(endDate)) {
        dates.push({
          date: currentDate,
          scheduleId: null,
          scheduleStatus: null,
        });
        currentDate = currentDate.add(1, "day");
      }
      return dates;
    },
    []
  );

  const initialStartDate = dayjs
    .utc()
    .startOf(scheduleViewSettings.timeFrame === "month" ? "month" : "isoWeek");
  const initialEndDate = dayjs
    .utc()
    .endOf(scheduleViewSettings.timeFrame === "month" ? "month" : "isoWeek");
  const intialPeriodDates = buildDates(initialStartDate, initialEndDate);
  const [periodStartDate, setPeriodStartDate] =
    useState<dayjs.Dayjs>(initialStartDate);
  const [periodEndDate, setPeriodEndDate] =
    useState<dayjs.Dayjs>(initialEndDate);
  const [periodDates, setPeriodDates] =
    useState<periodDateT[]>(intialPeriodDates);

  const handleAssignmentSelection = (selectedAssignment: AssignmentDataT) => {};

  const handleDemandSelection = (
    selectedScheduleCellData: ScheduleCellDataT
  ) => {};

  const updateScheduleViewSettings = (
    updates: Partial<ScheduleViewSettingsT>
  ) => {
    setScheduleViewSettings((prev) => ({ ...prev, ...updates }));
  };

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleSolveSchedule = async (scheduleId: string) => {};

  const handleValidateSchedule = async (scheduleId: string) => {};

  const handleSendDuplicateRequest = async (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ) => {};

  //////////////////////////
  // Daily Shift Demand Actions
  //////////////////////////

  const handleCreateDSD = async () => {};

  const handleUpdateDSD = async () => {};

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const handleOpenCreateAssignment = (
    createAssignmentData: CreateAssignmentT
  ) => {};

  const updateSelectedPeriod = (
    newPeriodStart: dayjs.Dayjs,
    newPeriodEnd: dayjs.Dayjs
  ) => {
    setPeriodStartDate(newPeriodStart);
    setPeriodEndDate(newPeriodEnd);
    setPeriodDates(buildDates(newPeriodStart, newPeriodEnd));
  };

  const handleToday = async () => {
    const newPeriodStart =
      scheduleViewSettings.timeFrame === "week"
        ? dayjs.utc().startOf("isoWeek")
        : scheduleViewSettings.timeFrame === "month"
        ? dayjs.utc().startOf("month")
        : dayjs.utc(); // Default to current time if neither "week" nor "month"
    const newPeriodEnd =
      scheduleViewSettings.timeFrame === "week"
        ? dayjs.utc().endOf("isoWeek")
        : scheduleViewSettings.timeFrame === "month"
        ? dayjs.utc().endOf("month")
        : dayjs.utc(); // Default to current time if neither "week" nor "month"
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handlePreviousPeriod = async () => {
    const newPeriodStart = periodStartDate.subtract(
      1,
      scheduleViewSettings.timeFrame === "month" ? "month" : "week"
    );
    const newPeriodEnd = periodEndDate.subtract(
      1,
      scheduleViewSettings.timeFrame === "month" ? "month" : "week"
    );
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handleNextPeriod = async () => {
    const newPeriodStart = periodStartDate.add(
      1,
      scheduleViewSettings.timeFrame === "month" ? "month" : "week"
    );
    const newPeriodEnd = periodEndDate.add(
      1,
      scheduleViewSettings.timeFrame === "month" ? "month" : "week"
    );
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handleChangeTimeFrame = async (newTimeFrame: "week" | "month") => {
    setScheduleViewSettings({
      ...scheduleViewSettings,
      timeFrame: newTimeFrame,
    });
    const { firstDate: newPeriodStart, lastDate: newPeriodEnd } =
      getPeriodStartEndDates(newTimeFrame, periodStartDate, periodEndDate);
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  //////////////////////////
  // Export Actions
  //////////////////////////

  const handleExportSchedule = async (exportOptions: ExportOptionsT) => {
    await exportSchedule(teamWithMembership.team.id, exportOptions);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingAssignments(true);

      try {
        // Fetch assignment data
        const {
          assignments: fetchedAssignments,
          workers: fetchedWorkers,
          shifts: fetchedShifts,
        } = await getScheduleAssignmentsDataMember(teamWithMembership.team.id);
        setAssignments(fetchedAssignments);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);

        setIsLoadingAssignments(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    fetchData();
  }, [teamWithMembership]);

  useEffect(() => {
    setPeriodDates(buildDates(periodStartDate, periodEndDate));
  }, [periodStartDate, periodEndDate, buildDates]);

  return (
    <div className="tab-container-ultrawide">
      <div>
        <ScheduleNavBar
          lng={lng}
          teamWithMembership={teamWithMembership}
          currentPeriodStart={periodStartDate}
          currentPeriodEnd={periodEndDate}
          scheduleCampaign={null}
          solveStatus={null}
          scheduleViewSettings={scheduleViewSettings}
          handleToday={handleToday}
          handlePreviousPeriod={handlePreviousPeriod}
          handleNextPeriod={handleNextPeriod}
          handleSolveSchedule={handleSolveSchedule}
          handleValidateSchedule={handleValidateSchedule}
          handleSendDuplicateRequest={handleSendDuplicateRequest}
          updateScheduleViewSettings={updateScheduleViewSettings}
          handleChangeTimeFrame={handleChangeTimeFrame}
          handleOpenLHS={() => {}}
        />
        <div style={{ display: "flex", flexDirection: "row" }}>
          {isLoadingAssignments ? (
            <ScheduleTableSkeleton />
          ) : assignments.length === 0 ? (
            <Box
              sx={{
                margin: 2,
                marginLeft: 0,
                overflowX: "auto",
                backgroundColor: "none",
                width: "100%",
              }}
            >
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ fontStyle: "italic" }}
              >
                {t("no_schedule_text")}
              </Typography>
            </Box>
          ) : (
            <ScheduleDisplay
              lng={lng}
              teamWithMembership={teamWithMembership}
              scheduleCampaign={null}
              periodDates={periodDates}
              assignments={assignments}
              shiftDemands={[]}
              shiftDemandMatrix={{}}
              recurrences={[]}
              breaches={[]}
              workers={workers}
              shifts={shifts}
              requests={[]}
              scheduleViewSettings={scheduleViewSettings}
              handleAssignmentSelection={handleAssignmentSelection}
              handleDemandSelection={handleDemandSelection}
              handleCreateShiftDemand={async () => {}}
              handleUpdateShiftDemand={async () => {}}
              handleDeleteShiftDemand={async () => {}}
              handleExportSchedule={handleExportSchedule}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
            />
          )}
        </div>
      </div>
    </div>
  );
}
