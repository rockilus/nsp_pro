import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import ScheduleConfig from "./ScheduleConfig";
import ConstraintBreachList from "./ConstraintBreachList";
import ScheduleOptions from "./ScheduleOptions";
import StatsTable from "./StatsTable";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";
import { useAssignmentStore } from "../../stores/assignmentStore";
import { useObjectiveBreachStore } from "../../stores/objectiveBreachStore";
import { useStatStore } from "../../stores/statStore";
import { ShiftIdNameT, WorkerIdNameT, ScheduleOptionsT } from "./types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ScheduleTab({ workers, shifts }: Props) {
  const [shiftSchedule, setShiftSchedule] = useState<boolean>(true);
  const [displayCBs, setDisplayCBs] = useState<boolean>(true);
  const [CBsDisplayed, setCBsDisplayed] = useState<string[]>([]);

  // Schedules
  const schedules = useScheduleStore((state) => state.schedules);
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedules);
  const addSchedule = useScheduleStore((state) => state.addSchedule);

  // Assignments
  const assignments = useAssignmentStore((state) => state.assignments);
  const fetchAssignments = useAssignmentStore(
    (state) => state.fetchAssignments
  );

  // Objective Breaches
  const objectiveBreaches = useObjectiveBreachStore(
    (state) => state.objectiveBreaches
  );
  const fetchObjectiveBreaches = useObjectiveBreachStore(
    (state) => state.fetchObjectiveBreaches
  );

  // Stats
  const stats = useStatStore((state) => state.stats);

  // FARs
  const fetchFixedAssignments = useFixedAssignmentStore(
    (state) => state.fetchFixedAssignments
  );
  const fetchRequests = useRequestStore((state) => state.fetchRequests);

  const addCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(Array.from(new Set([...CBsDisplayed, ...ids])));
  };
  const removeCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(CBsDisplayed.filter((cbId) => !ids.includes(cbId)));
  };

  useEffect(() => {
    fetchSchedule();
    fetchAssignments();
    fetchObjectiveBreaches();
  }, [fetchSchedule, fetchAssignments, fetchObjectiveBreaches]);

  useEffect(() => {
    if (schedules) {
      fetchFixedAssignments();
      fetchRequests();
    }
  }, [fetchFixedAssignments, fetchRequests, schedules]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h4" align="left">
        Schedule
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <ScheduleOptions
          schedules={schedules}
          shiftSchedule={shiftSchedule}
          displayCBs={displayCBs}
          addSchedule={addSchedule}
          switchScheduleDisplay={() => setShiftSchedule(!shiftSchedule)}
          switchDisplayCBs={() => setDisplayCBs(!displayCBs)}
        />
        <ScheduleConfig
          schedules={schedules}
          assignments={assignments}
          objectiveBreaches={objectiveBreaches}
          workers={workers}
          shifts={shifts}
          shiftSchedule={shiftSchedule}
          displayCBs={displayCBs}
          CBsDisplayed={CBsDisplayed}
        />
        <ConstraintBreachList
          objectiveBreaches={objectiveBreaches} // schedule.objectiveBreaches
          CBsDisplayed={CBsDisplayed}
          workers={workers}
          shifts={shifts}
          addCBsDisplayed={addCBsDisplayed}
          removeCBsDisplayed={removeCBsDisplayed}
        />
      </Box>
      {stats && <StatsTable stats={stats} workers={workers} shifts={shifts} />}
    </Box>
  );
}
