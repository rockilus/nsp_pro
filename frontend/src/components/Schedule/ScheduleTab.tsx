import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import ScheduleDisplay from "./Table/ScheduleDisplay";
import ObjectiveBreachList from "./ObjectiveBreachList";
import ScheduleOptions from "./ScheduleOptions/ScheduleOptions";
import ScheduleDisplayOptions from "./DisplayOptions/ScheduleDisplayOptions";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { ScheduleT, ObjectiveBreachT, AssignmentT } from "./types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
}

export default function ScheduleTab({
  team,
  workers,
  shifts,
  schedules,
  assignments,
  objectiveBreaches,
}: Props) {
  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [displayCBs, setDisplayCBs] = useState<boolean>(true);
  const [CBsDisplayed, setCBsDisplayed] = useState<string[]>([]);

  const addCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(Array.from(new Set([...CBsDisplayed, ...ids])));
  };
  const removeCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(CBsDisplayed.filter((cbId) => !ids.includes(cbId)));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <Box
        sx={{ display: "flex", flexDirection: "column", width: 800, margin: 2 }}
      >
        <ScheduleOptions
          team={team}
          schedules={schedules}
          selectedDisplay={selectedDisplay}
          displayCBs={displayCBs}
          setSelectedDisplay={setSelectedDisplay}
          switchDisplayCBs={() => setDisplayCBs(!displayCBs)}
        />
        <ScheduleDisplayOptions
          selectedDisplay={selectedDisplay}
          displayCBs={displayCBs}
          setSelectedDisplay={setSelectedDisplay}
          switchDisplayCBs={() => setDisplayCBs(!displayCBs)}
        />
      </Box>
      <ScheduleDisplay
        team={team}
        schedules={schedules}
        assignments={assignments}
        objectiveBreaches={objectiveBreaches}
        workers={workers}
        shifts={shifts}
        selectedDisplay={selectedDisplay}
        displayCBs={displayCBs}
        CBsDisplayed={CBsDisplayed}
      />

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
