import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
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
import TableRowScheduleWIP from "../data-display/table-row-schedule-wip";
import { GetStatusLabel } from "../data-display/get-status-label";
// Types
import { ScheduleT } from "../../types/schedule_temp";
//Constants
import { SolveStatusList, SolveStatusColors } from "../../constants/constants";

dayjs.extend(utc);

export default function ScheduleSelector({
  lng,
  schedule,
  handleAddSchedule,
  handleUpdateSchedule,
}: {
  lng: string;
  schedule: ScheduleT | null;
  handleAddSchedule: () => void;
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
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
          {t("common.campaign")}
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
                  name={t("common.start")}
                  content={
                    <DatePicker
                      value={schedule.startDate}
                      onChange={(newValue) => {
                        if (!newValue) return;
                        handleUpdateSchedule({
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
                  name={t("common.end")}
                  content={
                    <DatePicker
                      value={schedule.endDate}
                      onChange={(newValue) => {
                        if (!newValue) return;
                        handleUpdateSchedule({
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
                  name={t("common.status")}
                  content={
                    <Chip
                      label={GetStatusLabel(lng, schedule.solveStatus)}
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
            onClick={handleAddSchedule}
            sx={{
              paddingLeft: 0.3,
              paddingRight: 1,
              margin: "8px",
              height: "35px",
              // width: "100%",
              textTransform: "none",
            }}
          >
            {t("campaign.start_new_campaign")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
