import React from "react";
// Components
import ShiftTable from "./ShiftTable";
import WorkerTable from "./WorkerTable";
// Types
import {
  ShiftIdNameT,
  WorkerIdNameT,
  AssignmentT,
  ScheduleT,
  ObjectiveBreachT,
} from "./types";

interface Props {
  schedules: ScheduleT[];
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  selectedDisplay: string;
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleDisplay({
  schedules,
  assignments,
  objectiveBreaches,
  workers,
  shifts,
  selectedDisplay,
  displayCBs,
  CBsDisplayed,
}: Props) {
  const scheduleDisplays: { [key: string]: JSX.Element } = {
    shift: (
      <ShiftTable
        schedules={schedules}
        assignments={assignments}
        objectiveBreaches={objectiveBreaches}
        workers={workers}
        shifts={shifts}
        displayCBs={displayCBs}
        CBsDisplayed={CBsDisplayed}
      />
    ),
    worker: (
      <WorkerTable
        schedules={schedules}
        assignments={assignments}
        objectiveBreaches={objectiveBreaches}
        workers={workers}
        shifts={shifts}
        displayCBs={displayCBs}
        CBsDisplayed={CBsDisplayed}
      />
    ),
    // week: ScheduleTable,
  };

  return scheduleDisplays[selectedDisplay];
}
