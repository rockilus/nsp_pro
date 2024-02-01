import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
// Components
import SchedulePanelDialog from "./SchedulePanelDialog";
import ScheduleWIP from "./ScheduleWIP";
// Types
import { ScheduleT } from "./types";
// Utils
import { emptySchedule } from "../../utils/emptyObjects";

dayjs.extend(utc);

interface Props {
  schedules: ScheduleT[];
  selectedDisplay: string;
  displayCBs: boolean;
  setSelectedDisplay: (newSelectedDisplay: string) => void;
  switchDisplayCBs: () => void;
}

export default function ScheduleOptions({
  schedules,
  selectedDisplay,
  displayCBs,
  setSelectedDisplay,
  switchDisplayCBs,
}: Props) {
  const handleChange = (event: SelectChangeEvent) => {
    setSelectedDisplay(event.target.value as string);
  };

  const scheduleWIP = schedules.find((schedule) => schedule.status === "WIP");
  const scheduleWIPStartDate =
    schedules.length > 0
      ? schedules
          .filter((schedule) => schedule.status === "validated")
          ?.reduce(
            (latestSchedule, currentSchedule) =>
              currentSchedule.endDate > latestSchedule.endDate
                ? currentSchedule
                : latestSchedule,
            { endDate: dayjs.utc().startOf("day") }
          )
          .endDate.startOf("day") || dayjs.utc().startOf("day")
      : dayjs.utc().startOf("day");
  const newScheduleWIP = {
    ...emptySchedule,
    startDate: scheduleWIPStartDate.add(1, "day"),
    endDate: scheduleWIPStartDate.add(1, "month"),
  };

  const createScheduleButton = () => {
    return (
      <Button variant="contained" sx={{ paddingLeft: 0.3, paddingRight: 1 }}>
        <AddIcon />
        Schedule
      </Button>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        backgroundColor: "grey.100",
      }}
    >
      {scheduleWIP ? (
        <ScheduleWIP schedule={scheduleWIP} />
      ) : (
        <SchedulePanelDialog
          buttonElement={createScheduleButton()}
          schedule={newScheduleWIP}
        />
      )}
      <Divider
        orientation="vertical"
        sx={{ marginLeft: 2, marginRight: 2, height: 30 }}
      />
      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={selectedDisplay}
            onChange={handleChange}
          >
            <MenuItem value={"shift"}>Shift</MenuItem>
            <MenuItem value={"worker"}>Worker</MenuItem>
            {/* <MenuItem value={"week"}>Week</MenuItem> */}
          </Select>
        </FormControl>
      </Box>
      <ToggleButton
        value="breaches"
        color="primary"
        selected={displayCBs}
        onChange={switchDisplayCBs}
      >
        Breaches
      </ToggleButton>
    </Box>
  );
}
