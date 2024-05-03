import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import ScheduleDialogDelete from "./ScheduleDialogDelete";
import ScheduleDialogValidate from "./ScheduleDialogValidate";
import TableRowScheduleWIP from "./TableRowScheduleWIP";
// Stores
import { useScheduleStore } from "../../../stores/scheduleStore";
// Types
import { ScheduleT } from "../types";
import { TeamT } from "../../../containers/types";
//Constants
import { SolveStatusList, SolveStatusColors } from "../../../utils/constants";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedule: ScheduleT;
}

export default function ScheduleWIP({ team, schedule }: Props) {
  const [isSolving, setIsSolving] = useState(false);
  const solveSchedule = useScheduleStore((state) => state.solveSchedule);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

  const handleSolve = async () => {
    setIsSolving(true);
    await solveSchedule(schedule.id, team.id);
    setIsSolving(false);
  };

  return (
    <div>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name="Start"
              content={
                <DatePicker
                  value={schedule.startDate}
                  onChange={(newValue) => {
                    if (!newValue) return;
                    updateSchedule({
                      ...schedule,
                      startDate: dayjs.utc(newValue),
                    });
                  }}
                  sx={{
                    width: "160px",
                    "& .MuiOutlinedInput-input": {
                      fontSize: "0.875rem",
                      height: "40px",
                      paddingY: 0,
                    },
                  }}
                />
              }
            />
            <TableRowScheduleWIP
              name="End"
              content={
                <DatePicker
                  value={schedule.endDate}
                  onChange={(newValue) => {
                    if (!newValue) return;
                    updateSchedule({
                      ...schedule,
                      endDate: dayjs.utc(newValue),
                    });
                  }}
                  sx={{
                    width: "160px",
                    "& .MuiOutlinedInput-input": {
                      fontSize: "0.875rem",
                      height: "40px",
                      paddingY: 0,
                    },
                  }}
                />
              }
            />
            <TableRowScheduleWIP
              name="Status"
              content={
                <Chip
                  label={schedule.solveStatus}
                  color={
                    (SolveStatusColors[
                      SolveStatusList.indexOf(schedule.solveStatus)
                    ] as "default" | "success" | "error" | "warning") ||
                    "default"
                  }
                  sx={{ height: "25px", fontSize: "0.75rem" }}
                />
              }
            />
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isSolving ? (
          <Box
            sx={{
              backgroundColor: "#1976d2",
              height: "35px",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: 1,
            }}
          >
            <CircularProgress size={20} sx={{ color: "white" }} />
          </Box>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSolve}
            sx={{
              paddingLeft: 0.2,
              paddingRight: 0.2,
              margin: "8px",
              height: "35px",
            }}
          >
            Solve
          </Button>
        )}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            margin: "0 8px 8px 8px",
          }}
        >
          {/* <ScheduleDialogDelete team={team} scheduleId={schedule.id} /> */}
          <ScheduleDialogValidate team={team} scheduleId={schedule.id} />
        </Box>
      </Box>
    </div>
  );
}
