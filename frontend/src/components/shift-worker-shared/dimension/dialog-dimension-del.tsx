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

export default function DialogDimensionDel({
  lng,
  dimensionId,
  handleDeleteDimension,
}: {
  lng: string;
  dimensionId: string;
  handleDeleteDimension: (dimensionId: string) => void;
}) {
  const { t } = useTranslation(lng, "shift-page");

  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClickDelete = () => {
    handleDeleteDimension(dimensionId);
    handleClose();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Button
        variant="outlined"
        onClick={handleClickOpen}
        data-testid={`dimension-delete-button-${dimensionId}`}
        fullWidth
      >
        {t("delete")}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        data-testid={`dimension-delete-dialog-${dimensionId}`}
      >
        <DialogTitle id="alert-dialog-title">{t("delete_title")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t("delete_text")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClickDelete}
            color="error"
            data-testid={`dimension-delete-confirm-${dimensionId}`}
          >
            {t("delete_confirm")}
          </Button>
          <Button
            onClick={handleClose}
            autoFocus
            data-testid={`dimension-delete-cancel-${dimensionId}`}
          >
            {t("cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
