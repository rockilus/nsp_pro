import * as React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import ScheduleDeleteDialog from "./ScheduleDeleteDialog";
import { ScheduleT } from "./types";
import { useScheduleStore } from "../../stores/scheduleStore";

dayjs.extend(utc);

interface Props {
  buttonElement: React.ReactNode;
  schedule: ScheduleT;
}

export default function SchedulePanelDialog({
  buttonElement,
  schedule,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [scheduleState, setScheduleState] = React.useState<ScheduleT>({
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

  return (
    <React.Fragment>
      <Box
        onClick={handleClickOpen}
        sx={{ display: "inline-flex", minWidth: 0 }}
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
            {"Schedule WIP options"}
            <IconButton onClick={handleClose}>
              <CloseIcon color="disabled" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          {scheduleState.id && (
            <ScheduleDeleteDialog scheduleId={scheduleState.id} />
          )}
          <Button variant="contained" onClick={handleSaveSchedule} autoFocus>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
