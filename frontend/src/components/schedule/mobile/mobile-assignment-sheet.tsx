import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function MobileAssignmentSheet({
  open,
  onClose,
  assignment,
}: {
  open: boolean;
  onClose: () => void;
  assignment: any | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {assignment ? "Assignment" : "Create Assignment"}
      </DialogTitle>
      <DialogContent>
        {assignment ? (
          <>
            <Typography>{`Shift: ${assignment.shiftId || ""}`}</Typography>
            <Typography>{`Date: ${
              assignment.date ? new Date(assignment.date).toLocaleString() : ""
            }`}</Typography>
          </>
        ) : (
          <Typography color="textSecondary">
            Create a new assignment (form TBD)
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
