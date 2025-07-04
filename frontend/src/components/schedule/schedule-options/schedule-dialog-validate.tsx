import React, { useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
// Types
import { ScheduleT } from "../../../types/schedule";

export default function ScheduleDialogValidate({
  lng,
  scheduleCampaign,
  handleValidateSchedule,
}: {
  lng: string;
  scheduleCampaign: ScheduleT;
  handleValidateSchedule: (scheduleId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Button
        variant="outlined"
        onClick={handleClickOpen}
        sx={{
          paddingLeft: 0.2,
          paddingRight: 0.2,
          textTransform: "none",
          height: "35px",
          width: "65px",
        }}
      >
        {t("validate")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{t("validate_title")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("validate_text")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="error">
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              handleValidateSchedule(scheduleCampaign.id);
              handleClose();
            }}
            autoFocus
          >
            {t("validate")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
