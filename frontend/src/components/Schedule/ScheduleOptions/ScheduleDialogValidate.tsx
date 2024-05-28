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
import { useScheduleStore } from "../../../stores/scheduleStore";
// Types
import { TeamT } from "../../../containers/types";

interface Props {
  team: TeamT;
  scheduleId: string;
}

export default function ScheduleDialogValidate({ team, scheduleId }: Props) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const validateSchedule = useScheduleStore((state) => state.validateSchedule);

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
        sx={{
          paddingLeft: 0.2,
          paddingRight: 0.2,
          // marginLeft: "8px",
          textTransform: "none",
          height: "35px",
        }}
      >
        {t("common.validate")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t("schedule.validate_title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("schedule.validate_text")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="error">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              validateSchedule(scheduleId, team.id);
              handleClose();
            }}
            autoFocus
          >
            {t("common.validate")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
