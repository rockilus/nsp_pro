import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
// Components
import ScheduleWIP from "./schedule-wip";
// Types
import { ScheduleT } from "../../../types/schedule";
// Utils

dayjs.extend(utc);

export default function ScheduleOptions({
  lng,
  schedule,
  handleAddSchedule,
  handleSolveSchedule,
  handleValidateSchedule,
}: {
  lng: string;
  schedule: ScheduleT | null;
  handleAddSchedule: () => void;
  handleSolveSchedule: (scheduleId: string) => void;
  handleValidateSchedule: (scheduleId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

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
          {t("campaign")}
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
          <ScheduleWIP
            lng={lng}
            schedule={schedule}
            handleSolveSchedule={handleSolveSchedule}
            handleValidateSchedule={handleValidateSchedule}
          />
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
            Create schedule
          </Button>
        )}
      </Box>
    </Box>
  );
}
