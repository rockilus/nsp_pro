import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import AssignmentOptions from "./assignment-options";
import BreachList from "./breaches/breach-list";
import QuickStaffingTable from "./quick-staffing";
import ScheduleDisplay from "./table/schedule-display";
import ScheduleDisplayOptions from "./display-options/schedule-display-options";
import ScheduleOptions from "./schedule-options/schedule-options";
// Actions
import {
  getScheduleTabData,
  addSchedule,
  solveSchedule,
  validateSchedule,
  updateSchedule,
} from "../../app/lib/schedule";
import { updateAssignment } from "../../app/lib/assignment";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import {
  ScheduleT,
  ObjectiveBreachT,
  AssignmentT,
  SelectedCellT,
} from "../../types/schedule";
import { RequestT } from "../../types/request";

export default function ScheduleTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [schedule, setSchedule] = useState<ScheduleT | null>(null);
  const [assignments, setAssignments] = useState<AssignmentT[]>([]);
  const [breaches, setBreaches] = useState<ObjectiveBreachT[]>([]);

  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [showBreaches, setShowBreaches] = useState<boolean>(true);
  const [CBsDisplayed, setCBsDisplayed] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCellT | null>(null);

  const addCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(Array.from(new Set([...CBsDisplayed, ...ids])));
  };
  const removeCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(CBsDisplayed.filter((cbId) => !ids.includes(cbId)));
  };

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleAddSchedule = async () => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newSchedule = await addSchedule(selectedTeamId);
    setSchedule(newSchedule);
  };

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    const newSchedule = await updateSchedule(schedule);
    setSchedule(newSchedule);
  };

  const handleSolveSchedule = async (scheduleId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const {
      schedule: newSchedule,
      assignments: newAssignments,
      breaches: newBreaches,
      requests: newRequests,
    } = await solveSchedule(scheduleId, selectedTeamId);
    setSchedule(newSchedule);
    setAssignments((prev) => [
      ...prev.filter((a) => a.scheduleId !== scheduleId),
      ...newAssignments,
    ]);
    setBreaches(newBreaches);
    setRequests((prev) =>
      prev.map((r) => newRequests.find((nr) => nr.id === r.id) || r)
    );
  };

  const handleValidateSchedule = async (scheduleId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const { schedule: newSchedule, assignments: newAssignments } =
      await validateSchedule(scheduleId, selectedTeamId);
    setSchedule(newSchedule);
    setAssignments((prev) =>
      prev.map((a) => newAssignments.find((na) => na.id === a.id) || a)
    );
  };

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const handleUpdateAssignment = async (assignment: AssignmentT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newAssignment = await updateAssignment(assignment, selectedTeamId);
    setAssignments(
      assignments.map((a) => (a.id === newAssignment.id ? newAssignment : a))
    );
  };

  useEffect(() => {
    const fetchScheduleTabData = async () => {
      if (selectedTeamId) {
        const {
          assignments: fetchedAssignments,
          breaches: fetchedBreaches,
          requests: fetchedRequests,
          schedule: fetchedSchedule,
          workers: fetchedWorkers,
          shifts: fetchedShifts,
        } = await getScheduleTabData(selectedTeamId);
        setAssignments(fetchedAssignments);
        setBreaches(fetchedBreaches);
        setRequests(fetchedRequests);
        setSchedule(fetchedSchedule);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
      }
    };
    fetchScheduleTabData();
  }, [selectedTeamId]);

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <Box
        sx={{ display: "flex", flexDirection: "column", width: 800, margin: 2 }}
      >
        <ScheduleOptions
          lng={lng}
          schedule={schedule}
          handleAddSchedule={handleAddSchedule}
          handleSolveSchedule={handleSolveSchedule}
          handleValidateSchedule={handleValidateSchedule}
        />
        <ScheduleDisplayOptions
          lng={lng}
          selectedDisplay={selectedDisplay}
          displayCBs={showBreaches}
          setSelectedDisplay={setSelectedDisplay}
          switchDisplayCBs={() => setShowBreaches(!showBreaches)}
        />
        <BreachList
          lng={lng}
          breaches={breaches} // schedule.objectiveBreaches
          CBsDisplayed={CBsDisplayed}
          workers={workers}
          shifts={shifts}
          addCBsDisplayed={addCBsDisplayed}
          removeCBsDisplayed={removeCBsDisplayed}
        />
        {schedule && (
          <QuickStaffingTable
            lng={lng}
            shifts={shifts}
            workers={workers}
            assignments={assignments}
            schedule={schedule as ScheduleT}
            handleUpdateSchedule={handleUpdateSchedule}
          />
        )}
      </Box>
      {assignments.length === 0 || !schedule ? (
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
          schedule={schedule as ScheduleT}
          assignments={assignments}
          breaches={breaches}
          workers={workers}
          shifts={shifts}
          requests={requests}
          selectedDisplay={selectedDisplay}
          showBreaches={showBreaches}
          CBsDisplayed={CBsDisplayed}
          setSelectedCell={setSelectedCell}
        />
      )}
      {selectedCell && (
        <AssignmentOptions
          lng={lng}
          workers={workers}
          shifts={shifts}
          assignments={assignments}
          selectedCell={selectedCell}
          selectedDisplay={selectedDisplay}
          setSelectedCell={setSelectedCell}
          handleUpdateAssignment={handleUpdateAssignment}
        />
      )}
    </Box>
  );
}
