import * as React from "react";

import SignUp from "./SignUpTemplate";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import Link from "@mui/material/Link";

export default function SignUpDialog() {
  const [openSignUp, setOpenSignUp] = React.useState(false);

  const handleClickOpenSignUp = () => {
    setOpenSignUp(true);
  };

  const handleCloseSignUp = () => {
    setOpenSignUp(false);
  };

  return (
    <div>
      <Button color="inherit" onClick={handleClickOpenSignUp}>
        Sign Up
      </Button>
      <Dialog
        open={openSignUp}
        onClose={handleCloseSignUp}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <SignUp />
        <DialogActions>
          <Button onClick={handleCloseSignUp} autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
