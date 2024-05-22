import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import AssignmentOptions from "./AssignmentOptions";
import ObjectiveBreachList from "./Breaches/ObjectiveBreachList";
import QuickStaffingTable from "./QuickStaffing";
import ScheduleDisplay from "./Table/ScheduleDisplay";
import ScheduleDisplayOptions from "./DisplayOptions/ScheduleDisplayOptions";
import ScheduleOptions from "./ScheduleOptions/ScheduleOptions";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import {
  ScheduleT,
  ObjectiveBreachT,
  AssignmentT,
  SelectedCellT,
} from "./types";
import { RequestT } from "../Request/types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  schedule: ScheduleT | null;
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
}

export default function ScheduleTab({
  team,
  workers,
  shifts,
  requests,
  schedule,
  assignments,
  objectiveBreaches,
}: Props) {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <Box
        sx={{ display: "flex", flexDirection: "column", width: 800, margin: 2 }}
      >
        <ScheduleOptions team={team} schedule={schedule} />
        <ScheduleDisplayOptions
          selectedDisplay={selectedDisplay}
          displayCBs={showBreaches}
          setSelectedDisplay={setSelectedDisplay}
          switchDisplayCBs={() => setShowBreaches(!showBreaches)}
        />
        <ObjectiveBreachList
          objectiveBreaches={objectiveBreaches} // schedule.objectiveBreaches
          CBsDisplayed={CBsDisplayed}
          workers={workers}
          shifts={shifts}
          addCBsDisplayed={addCBsDisplayed}
          removeCBsDisplayed={removeCBsDisplayed}
        />
        {schedule && (
          <QuickStaffingTable
            shifts={shifts}
            workers={workers}
            assignments={assignments}
            schedule={schedule as ScheduleT}
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
            {"Configure your schedule and solve it to get your planning."}
          </Typography>
        </Box>
      ) : (
        <ScheduleDisplay
          team={team}
          schedule={schedule as ScheduleT}
          assignments={assignments}
          breaches={objectiveBreaches}
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
          team={team}
          workers={workers}
          shifts={shifts}
          assignments={assignments}
          selectedCell={selectedCell}
          selectedDisplay={selectedDisplay}
          setSelectedCell={setSelectedCell}
        />
      )}
    </Box>
  );
}
