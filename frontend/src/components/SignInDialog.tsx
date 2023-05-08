import * as React from "react";

import SignInTemplate from "./SignInTemplate";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";

export default function SignInDialog() {
  const [openSignIn, setOpenSignIn] = React.useState(false);

  const handleClickOpenSignIn = () => {
    setOpenSignIn(true);
  };

  const handleCloseSignIn = () => {
    setOpenSignIn(false);
  };

  return (
    <div>
      <Button color="inherit" onClick={handleClickOpenSignIn}>
        Sign In
      </Button>
      <Dialog
        open={openSignIn}
        onClose={handleCloseSignIn}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <SignInTemplate handleCloseSignIn={handleCloseSignIn} />
        <DialogActions>
          <Button onClick={handleCloseSignIn} autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
