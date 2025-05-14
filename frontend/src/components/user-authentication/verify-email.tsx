"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
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
import { shouldLoadRoute } from "../sessionAuthForNextJS";

export default function VerifyEmail({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "auth-page");

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
    const checkEmailVerification = async () => {
      try {
        const status = await shouldLoadRoute(); // Fetch email verification status
        if (status) {
          // If email is verified, redirect to the desired page
          window.location.assign("/en/plan/workers");
        }
      } catch (error) {
        console.error("Error fetching email verification status:", error);
        // Handle error, maybe redirect to an error page
      }
    };

    checkEmailVerification();
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
          {t("email_verification")}
        </Typography>
        <Typography variant="body1">
          {t("email_verification_message")}
        </Typography>
        <Button
          onClick={handleSendEmail}
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          {t("resend_email")}
        </Button>
      </Box>
      <SnackBarComponent
        message={t("send_email_success_message")}
        severity="success"
        open={openSuccess}
        handleClose={() => setOpenSuccess(false)}
      />
      <SnackBarComponent
        message={t("error_message")}
        severity="error"
        open={openError}
        handleClose={() => setOpenError(false)}
      />
    </Container>
  );
}
