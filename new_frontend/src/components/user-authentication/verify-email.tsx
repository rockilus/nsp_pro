"use client";

import React, { useState, useEffect } from "react";
// MUI
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
// Components
import SnackBarComponent from "../feedback/snack-bar";
// Actions
import { sendEmail } from "../../app/lib/authentication";

export default function VerifyEmail() {
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openError, setOpenError] = useState(false);

  const handleSendEmail = async () => {
    const out = await sendEmail();
    if (out === "alreadyVerified") {
      window.location.assign("/en/plan/workers");
    } else if (out === "success") {
      setOpenSuccess(true);
    } else if (out === "error") {
      setOpenError(true);
    }
  };

  useEffect(() => {
    console.log("about to send verification email");
    handleSendEmail();
  }, []);

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
          <MailOutlineIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Email verification
        </Typography>
        <Typography variant="body1">
          A verification email was sent, check your inbox.
        </Typography>
        <Button
          onClick={handleSendEmail}
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Resend email
        </Button>
      </Box>
      <SnackBarComponent
        message="Email sent successfully."
        severity="success"
        open={openSuccess}
        handleClose={() => setOpenSuccess(false)}
      />
      <SnackBarComponent
        message="Something went wrong."
        severity="error"
        open={openError}
        handleClose={() => setOpenError(false)}
      />
    </Container>
  );
}
