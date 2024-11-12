import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
// Components
import ScheduleDialogValidate from "./schedule-dialog-validate";
import TableRowScheduleWIP from "./table-row-schedule-wip";
import { GetStatusLabel } from "../../data-display/get-status-label";
// Types
import { ScheduleT } from "../../../types/schedule";
//Constants
import {
  SolveStatusList,
  SolveStatusColors,
} from "../../../constants/constants";

dayjs.extend(utc);

export default function ScheduleWIP({
  lng,
  scheduleCampaign,
  handleSolveSchedule,
  handleValidateSchedule,
}: {
  lng: string;
  scheduleCampaign: ScheduleT;
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [isSolving, setIsSolving] = useState(false);

  const handleSolve = async () => {
    setIsSolving(true);
    await handleSolveSchedule(scheduleCampaign.id);
    setIsSolving(false);
  };

  return (
    <div>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name={t("start")}
              content={scheduleCampaign.startDate.format("D MMM YYYY")}
            />
            <TableRowScheduleWIP
              name={t("end")}
              content={scheduleCampaign.endDate.format("D MMM YYYY")}
            />
            <TableRowScheduleWIP
              name={t("status")}
              content={
                <Chip
                  label={GetStatusLabel(lng, scheduleCampaign.solveStatus)}
                  color={
                    (SolveStatusColors[scheduleCampaign.solveStatus] as
                      | "default"
                      | "success"
                      | "error"
                      | "warning") || "default"
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
            {t("solve")}
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
          <ScheduleDialogValidate
            lng={lng}
            scheduleCampaign={scheduleCampaign}
            handleValidateSchedule={handleValidateSchedule}
          />
        </Box>
      </Box>
    </div>
  );
}
