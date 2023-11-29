import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import { useScheduleStore } from "../../stores/scheduleStore";

interface Props {
  scheduleId: string;
}

export default function ScheduleValidateDialog({ scheduleId }: Props) {
  const [open, setOpen] = useState(false);
  const validateSchedule = useScheduleStore((state) => state.validateSchedule);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", marginRight: 1 }}>
      <Button variant="outlined" onClick={handleClickOpen} fullWidth>
        Validate
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Validate this schedule?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Validating this schedule will send the assignments to your team for
            the schedule period. Changes to the schedule will be limited.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="error">
            Cancel
          </Button>
          <Button
            onClick={() => {
              validateSchedule(scheduleId);
              handleClose();
            }}
            autoFocus
          >
            Validate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
