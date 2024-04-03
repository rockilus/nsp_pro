import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
// Stores
import { useShiftDimensionStore } from "../../stores/shiftDimensionStore";
import { useTeamStore } from "../../stores/teamStore";

interface Props {
  shiftDimensionId: string;
}

export default function DialogShiftDimensionDel({ shiftDimensionId }: Props) {
  const [open, setOpen] = useState(false);

  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const deleteShiftDimension = useShiftDimensionStore(
    (state) => state.deleteShiftDimension
  );

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Button variant="outlined" onClick={handleClickOpen} fullWidth>
        Delete property
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete this property for all?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Deleting this property will remove it from all workers. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (selectedTeam) {
                deleteShiftDimension(shiftDimensionId, selectedTeam.id);
                handleClose();
              }
            }}
            color="error"
          >
            Delete all
          </Button>
          <Button onClick={handleClose} autoFocus>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
