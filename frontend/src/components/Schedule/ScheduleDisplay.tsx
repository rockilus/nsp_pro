import React from "react";
// Components
import ShiftTable from "./ShiftTable";
import WorkerTable from "./WorkerTable";
// Types
import { AssignmentT, ScheduleT, ObjectiveBreachT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  schedules: ScheduleT[];
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  selectedDisplay: string;
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleDisplay({
  team,
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
        team={team}
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
        team={team}
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
