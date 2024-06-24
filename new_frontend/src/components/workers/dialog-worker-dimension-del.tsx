import React, { useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function DialogWorkerDimensionDel({
  lng,
  workerDimensionId,
  handleDeleteWorkerDimension,
}: {
  lng: string;
  workerDimensionId: string;
  handleDeleteWorkerDimension: (workerDimensionId: string) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box>
      <Button variant="outlined" onClick={handleClickOpen}>
        {t("delete")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{t("delete_title")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("delete_text")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleDeleteWorkerDimension(workerDimensionId);
              handleClose();
            }}
            color="error"
          >
            {t("delete_confirm")}
          </Button>
          <Button onClick={handleClose} autoFocus>
            {t("cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
