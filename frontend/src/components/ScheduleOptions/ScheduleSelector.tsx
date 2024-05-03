import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import ScheduleWIP from "../Schedule/ScheduleOptions/ScheduleWIP";
import TableRowScheduleWIP from "../Schedule/ScheduleOptions/TableRowScheduleWIP";
// Stores
import { useScheduleStore } from "../../stores/scheduleStore";
// Types
import { ScheduleT } from "../Schedule//types";
import { TeamT } from "../../containers/types";
//Constants
import { SolveStatusList, SolveStatusColors } from "../../utils/constants";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedule: ScheduleT | null;
}

export default function ScheduleSelector({ team, schedule }: Props) {
  const addSchedule = useScheduleStore((state) => state.addSchedule);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        border: "1px solid grey",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
          borderBottom: "1px solid lightgrey",
          backgroundColor: "grey.100",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          Schedule
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {schedule ? (
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
        ) : (
          <Button
            variant="contained"
            onClick={() => addSchedule(team.id)}
            sx={{
              paddingLeft: 0.3,
              paddingRight: 1,
              margin: "8px",
              height: "35px",
              // width: "100%",
              textTransform: "none",
            }}
          >
            Create schedule
          </Button>
        )}
      </Box>
    </Box>
  );
}
