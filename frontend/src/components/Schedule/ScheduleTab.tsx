import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import ScheduleDisplay from "./Table/ScheduleDisplay";
import ObjectiveBreachList from "./Breaches/ObjectiveBreachList";
import ScheduleOptions from "./ScheduleOptions/ScheduleOptions";
import ScheduleDisplayOptions from "./DisplayOptions/ScheduleDisplayOptions";
import QuickStaffingTable from "./QuickStaffing";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { ScheduleT, ObjectiveBreachT, AssignmentT } from "./types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedule: ScheduleT | null;
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
}

export default function ScheduleTab({
  team,
  workers,
  shifts,
  schedule,
  assignments,
  objectiveBreaches,
}: Props) {
  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [showBreaches, setShowBreaches] = useState<boolean>(true);
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
          selectedDisplay={selectedDisplay}
          showBreaches={showBreaches}
          CBsDisplayed={CBsDisplayed}
        />
      )}
    </Box>
  );
}
