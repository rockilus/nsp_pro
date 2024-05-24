import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
        {t("common.delete")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t("worker_shift.delete_title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("shift.delete_text")}
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
            {t("worker_shift.delete_confirm")}
          </Button>
          <Button onClick={handleClose} autoFocus>
            {t("common.cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
