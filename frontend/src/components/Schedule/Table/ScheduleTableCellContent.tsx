import dayjs from "dayjs";
import React from "react";
// MUI
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { red } from "@mui/material/colors";
// Utils
import {
  getBreachType,
  getCellBackgroundColor,
} from "../../../utils/scheduleUtils";
// Types
import { TeamT } from "../../../containers/types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";
import {
  AssignmentT,
  ScheduleT,
  ObjectiveBreachT,
  SelectedCellT,
} from "../types";
import { RequestT } from "../../Request/types";

interface Props {
  team: TeamT;
  worker: WorkerT;
  shift: ShiftT;
  requests: RequestT[];
  assignment: AssignmentT;
  schedule: ScheduleT;
  breaches: ObjectiveBreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  setSelectedCell: (seletedCell: SelectedCellT | null) => void;
}

export default function ScheduleTableCellContent({
  team,
  worker,
  shift,
  requests,
  assignment,
  schedule,
  breaches,
  showBreaches,
  selectedDisplay,
  setSelectedCell,
}: Props) {
  const backColor = getBreachType(breaches);

  return (
    <Box
      onClick={() =>
        setSelectedCell({
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
      }}
    >
      {selectedDisplay === "worker" && assignment && shift && shift.name}
      {selectedDisplay === "shift" && assignment && worker && worker.name}
    </Box>
  );
}
