import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import AdjustIcon from "@mui/icons-material/Adjust";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import ClearIcon from "@mui/icons-material/Clear";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import RemoveIcon from "@mui/icons-material/Remove";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Components
import StatsTable from "../../stats/table/stats-table";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import {
  AssignmentT,
  ScheduleT,
  QuickStaffingT,
} from "../../../types/schedule";
import { StatsT } from "../../../types/stats";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function QuickStatsTable({
  lng,
  shifts,
  workers,
  stats,
}: {
  lng: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  stats: StatsT;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        margin: "10px 10px 5px 5px",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#3C4043",
        }}
      >
        {t("quick_staffing")}
      </span>
      <StatsTable
        lng={lng}
        stats={stats}
        showingCustom={true}
        workers={workers}
        shifts={shifts}
        statsUnitOptions={[]}
        handleAddHeader={() => {}}
        handleDeleteHeader={() => {}}
      />
    </div>
  );
}
