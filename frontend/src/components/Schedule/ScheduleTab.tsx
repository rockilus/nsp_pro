import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import ScheduleConfig from "./ScheduleConfig";
import ConstraintBreachList from "./ConstraintBreachList";
import ScheduleOptions from "./ScheduleOptions";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";
import { ShiftIdNameT, WorkerIdNameT, ScheduleOptionsT } from "./types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ScheduleTab({ workers, shifts }: Props) {
  const [shiftSchedule, setShiftSchedule] = useState<boolean>(true);
  const [displayCBs, setDisplayCBs] = useState<boolean>(true);
  const [CBsDisplayed, setCBsDisplayed] = useState<string[]>([]);

  const schedule = useScheduleStore((state) => state.schedule);
  // const fetchSchedule = useScheduleStore((state) => state.fetchSchedule);
  const addSchedule = useScheduleStore((state) => state.addSchedule);
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

  // useEffect(() => {
  //   fetchSchedule();
  // }, [fetchSchedule]);

  useEffect(() => {
    if (schedule) {
      fetchFixedAssignments();
      fetchRequests();
    }
  }, [fetchFixedAssignments, fetchRequests, schedule]);

  useEffect(() => {
    if (schedule) {
      setCBsDisplayed(schedule.comments.constraintBreaches.map((cb) => cb.id));
    }
  }, [schedule]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h4" align="left">
        Schedule
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        {/* <ScheduleOptions
          schedule={schedule}
          shiftSchedule={shiftSchedule}
          displayCBs={displayCBs}
          addSchedule={addSchedule}
          switchScheduleDisplay={() => setShiftSchedule(!shiftSchedule)}
          switchDisplayCBs={() => setDisplayCBs(!displayCBs)}
        /> */}
        {/* <ScheduleConfig
          schedule={schedule}
          workers={workers}
          shifts={shifts}
          shiftSchedule={shiftSchedule}
          displayCBs={displayCBs}
          CBsDisplayed={CBsDisplayed}
        /> */}
        {/* <ConstraintBreachList
          constraintBreaches={schedule.comments.constraintBreaches}
          CBsDisplayed={CBsDisplayed}
          workers={workers}
          shifts={shifts}
          addCBsDisplayed={addCBsDisplayed}
          removeCBsDisplayed={removeCBsDisplayed}
        /> */}
      </Box>
    </Box>
  );
}
