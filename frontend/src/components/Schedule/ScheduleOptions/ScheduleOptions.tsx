import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
// Components
import ScheduleWIP from "./ScheduleWIP";
// Stores
import { useScheduleStore } from "../../../stores/scheduleStore";
// Types
import { ScheduleT } from "../types";
import { TeamT } from "../../../containers/types";
// Utils

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedule: ScheduleT | null;
}

export default function ScheduleOptions({ team, schedule }: Props) {
  const { t } = useTranslation();

  const addSchedule = useScheduleStore((state) => state.addSchedule);
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
          <ScheduleWIP team={team} schedule={schedule} />
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
