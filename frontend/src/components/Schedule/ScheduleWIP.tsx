import * as React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleT } from "./types";

dayjs.extend(utc);

interface Props {
  schedule: ScheduleT;
}

export default function ScheduleWIP({ schedule }: Props) {
  const [open, setOpen] = React.useState(false);
  const [scheduleState, setScheduleState] = React.useState<ScheduleT>({
    ...schedule,
  });

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <Button variant="contained" onClick={handleClickOpen}>
        Create schedule
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Schedule WIP options"}
        </DialogTitle>
        <DialogContent>
          <DatePicker
            label="Start date"
            value={schedule.startDate}
            onChange={(newValue) =>
              setScheduleState({
                ...scheduleState,
                startDate: newValue ? dayjs.utc(newValue) : dayjs.utc(),
              })
            }
          />
          <DatePicker
            label="End date"
            value={schedule.endDate}
            onChange={(newValue) =>
              setScheduleState({
                ...scheduleState,
                endDate: newValue ? dayjs.utc(newValue) : dayjs.utc(),
              })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleClose}>
            Delete
          </Button>
          <Button variant="contained" onClick={handleClose} autoFocus>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
