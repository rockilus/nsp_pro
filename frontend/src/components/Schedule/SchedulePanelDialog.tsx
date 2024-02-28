import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Components
import ScheduleDeleteDialog from "./ScheduleDeleteDialog";
// Stores
import { useScheduleStore } from "../../stores/scheduleStore";
// Types
import { ScheduleT } from "./types";
import { TeamT } from "../../containers/types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  buttonElement: React.ReactNode;
  schedule: ScheduleT;
}

export default function SchedulePanelDialog({
  team,
  buttonElement,
  schedule,
}: Props) {
  const [open, setOpen] = useState(false);
  const [scheduleState, setScheduleState] = useState<ScheduleT>({
    ...schedule,
  });

  const addSchedule = useScheduleStore((state) => state.addSchedule);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSaveSchedule = () => {
    if (scheduleState.id) {
      updateSchedule(scheduleState);
    } else {
      addSchedule(scheduleState);
    }
    handleClose();
  };

  useEffect(() => {
    setScheduleState({ ...schedule });
  }, [schedule]);

  return (
    <React.Fragment>
      <Box
        onClick={handleClickOpen}
        sx={{
          display: "inline-flex",
          minWidth: 0,
          cursor: "pointer",
        }}
      >
        {buttonElement}
      </Box>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {"Schedule options"}
            <IconButton onClick={handleClose}>
              <CloseIcon color="disabled" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {schedule.status === "WIP" ? (
            <div>
              <DatePicker
                label="Start date"
                value={schedule.startDate}
                onChange={(newValue) =>
                  setScheduleState({
                    ...scheduleState,
                    startDate: newValue
                      ? dayjs.utc(newValue).startOf("day")
                      : dayjs.utc().startOf("day"),
                  })
                }
              />
              <DatePicker
                label="End date"
                value={schedule.endDate}
                onChange={(newValue) =>
                  setScheduleState({
                    ...scheduleState,
                    endDate: newValue
                      ? dayjs.utc(newValue).startOf("day")
                      : dayjs.utc().startOf("day"),
                  })
                }
              />
            </div>
          ) : (
            <div>
              {schedule.startDate.format("D MMM YYYY")}
              {" - "}
              {schedule.endDate.format("D MMM YYYY")}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {scheduleState.id && (
            <ScheduleDeleteDialog team={team} scheduleId={scheduleState.id} />
          )}
          {schedule.status === "WIP" && (
            <Button variant="contained" onClick={handleSaveSchedule} autoFocus>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
