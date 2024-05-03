import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import CoverageSelector from "./CoverageSelector";
import ScheduleSelector from "./ScheduleSelector";
// Stores
import { useCoverageSelectorStore } from "../../stores/coverageSelectorStore";
// Types
import { CoverageSelectorT } from "./types";
import { TeamT } from "../../containers/types";
import { CoverageT } from "../Coverage/types";
import { ScheduleT } from "../Schedule/types";

interface Props {
  team: TeamT;
  schedule: ScheduleT | null;
  coverageSelectors: CoverageSelectorT[];
  coverages: CoverageT[];
}

export default function ScheduleOptionsTab({
  team,
  schedule,
  coverageSelectors,
  coverages,
}: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <ScheduleSelector team={team} schedule={schedule} />
      {schedule && (
        <CoverageSelector
          team={team}
          schedule={schedule}
          coverageSelectors={coverageSelectors}
          coverages={coverages}
        />
      )}
    </Box>
  );
}
