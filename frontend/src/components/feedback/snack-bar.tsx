import React from "react";
// MUI
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export default function SnackBarComponent({
  message,
  severity,
  open,
  handleClose,
}: {
  message: string;
  severity: "success" | "error" | "warning" | "info";
  open: boolean;
  handleClose: () => void;
}) {
  return (
    <Snackbar open={open} autoHideDuration={5000} onClose={handleClose}>
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
