import React from "react";
// MUI
import Box from "@mui/material/Box";
import { red } from "@mui/material/colors";
// Utils
import { getBreachType } from "../../data-display/schedule-utils";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { AssignmentT, BreachT, SelectedCellT } from "../../../types/schedule";
import { RequestT } from "../../../types/request";
import dayjs from "dayjs";

export default function ScheduleTableCellContent({
  worker,
  shift,
  requests,
  assignment,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
}: {
  worker: WorkerT;
  shift: ShiftT;
  requests: RequestT[];
  assignment: AssignmentT;
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (seletedCell: SelectedCellT) => void;
}) {
  const backColor = getBreachType(breaches);

  return (
    <Box
      onClick={() =>
        handleCellSelection({
          assignment: assignment,
          worker: worker,
          shift: shift,
          requests: requests,
          breaches: breaches,
        })
      }
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: showBreaches
          ? backColor === "hardBreach"
            ? red[200]
            : backColor === "softBreach"
            ? red[100]
            : "none"
          : "none",
        border:
          assignment.status === "wip" && assignment.fixed
            ? "3px solid #bdbdbd"
            : "none",
        cursor: "pointer",
        color: assignment.date.isBefore(dayjs(), "day")
          ? "black"
          : selectedDisplay === "shift"
          ? worker.deleted
            ? "red"
            : "black"
          : "black",
      }}
    >
      {selectedDisplay === "worker" && assignment && shift && shift.name}
      {selectedDisplay === "shift" && assignment && worker && worker.name}
    </Box>
  );
}
