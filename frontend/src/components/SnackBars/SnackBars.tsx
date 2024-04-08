import * as React from "react";
// MUI
import Alert, { AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
//Stores
import { useSnackBarStore } from "../../stores/snackbarStore";

export default function SimpleSnackbar() {
  const snackBar = useSnackBarStore((state) => state.snackBar);
  const closeSnackBar = useSnackBarStore((state) => state.closeSnackBar);

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }

    closeSnackBar();
  };

  const action = (
    <React.Fragment>
      <IconButton
        size="small"
        aria-label="close"
        color="inherit"
        onClick={handleClose}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </React.Fragment>
  );

  return (
    <div>
      {["success", "error", "warning", "info"].includes(snackBar.type) ? (
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          open={snackBar.open}
          autoHideDuration={6000}
          onClose={handleClose}
        >
          <Alert
            severity={snackBar.type as AlertColor}
            onClose={handleClose}
            sx={{ width: "100%" }}
          >
            {snackBar.message}
          </Alert>
        </Snackbar>
      ) : (
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          open={snackBar.open}
          autoHideDuration={6000}
          onClose={handleClose}
          message={snackBar.message}
          action={action}
        />
      )}
    </div>
  );
}
