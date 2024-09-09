import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function ScheduleDialogDelete({
  scheduleId,
  handleDeleteSchedule,
}: {
  scheduleId: string;
  handleDeleteSchedule: (scheduleId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
      <Button
        variant="outlined"
        onClick={handleClickOpen}
        color="error"
        sx={{
          paddingLeft: 0.2,
          paddingRight: 0.2,
          textTransform: "none",
          height: "35px",
        }}
      >
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete this schedule?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Deleting this schedule will delete its configuration and all its
            assignments. This action is not reversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => {
              handleDeleteSchedule(scheduleId);
              handleClose();
            }}
            autoFocus
          >
            Delete
          </Button>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
