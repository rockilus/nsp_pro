import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import ScheduleDisplay from "./ScheduleDisplay";
import ObjectiveBreachList from "./ObjectiveBreachList";
import ScheduleOptions from "./ScheduleOptions";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";
import { useAssignmentStore } from "../../stores/assignmentStore";
import { useObjectiveBreachStore } from "../../stores/objectiveBreachStore";
import { ShiftIdNameT, WorkerIdNameT } from "./types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ScheduleTab({ workers, shifts }: Props) {
  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [shiftSchedule, setShiftSchedule] = useState<boolean>(true);
  const [displayCBs, setDisplayCBs] = useState<boolean>(true);
  const [CBsDisplayed, setCBsDisplayed] = useState<string[]>([]);

  // Schedules
  const schedules = useScheduleStore((state) => state.schedules);
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedules);

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
      <ScheduleOptions
        schedules={schedules}
        selectedDisplay={selectedDisplay}
        displayCBs={displayCBs}
        setSelectedDisplay={setSelectedDisplay}
        switchDisplayCBs={() => setDisplayCBs(!displayCBs)}
      />
      <ScheduleDisplay
        schedules={schedules}
        assignments={assignments}
        objectiveBreaches={objectiveBreaches}
        workers={workers}
        shifts={shifts}
        selectedDisplay={selectedDisplay}
        displayCBs={displayCBs}
        CBsDisplayed={CBsDisplayed}
      />
      <Typography variant="h4" align="left">
        Objective breaches
      </Typography>
      <ObjectiveBreachList
        objectiveBreaches={objectiveBreaches} // schedule.objectiveBreaches
        CBsDisplayed={CBsDisplayed}
        workers={workers}
        shifts={shifts}
        addCBsDisplayed={addCBsDisplayed}
        removeCBsDisplayed={removeCBsDisplayed}
      />
    </Box>
  );
}
