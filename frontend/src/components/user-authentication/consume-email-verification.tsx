"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
import { usePathname, useRouter } from "next/navigation";
// MUI
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import Typography from "@mui/material/Typography";
// Components
import SnackBarComponent from "../feedback/snack-bar";
// Actions
import {
  consumeVerificationCode,
  checkAuthNSessionExist,
} from "../../app/lib/authentication";

export default function ConsumeEmailVerification({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "auth-page");

  const [isLoading, setIsLoading] = useState(true);
  const [isSession, setIsSession] = useState(false);
  const [openError, setOpenError] = useState(false);
  const router = useRouter();

  const handleConsumeVerificationEmail = async () => {
    const out = await consumeVerificationCode();
    router.replace(`/${lng}/plan/settings/teams`);

    // console.log("out", out);

    // if (out === "success") {
    //   window.location.assign("/en/plan/workers");
    // } else if (out === "invalidToken") {
    //   window.location.assign("/auth/verify-email");
    // } else if (out === "error") {
    //   setOpenError(true);
    // }
  };

  useEffect(() => {
    const consumeEmailEffect = async () => {
      console.log("about to check session");
      const hasSession = await checkAuthNSessionExist();
      setIsSession(hasSession);
      if (hasSession) {
        console.log("about to consume verification code");
        await handleConsumeVerificationEmail();
      }
      setIsLoading(false);
    };
    consumeEmailEffect();
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
          {t("verifying_email")}
        </Typography>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <div>
            <Typography variant="body1">
              {t("verify_email_button_message")}
            </Typography>
            <Button
              onClick={handleConsumeVerificationEmail}
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              {t("verify_email")}
            </Button>
          </div>
        )}
      </Box>
      <SnackBarComponent
        message={t("error_message")}
        severity="error"
        open={openError}
        handleClose={() => setOpenError(false)}
      />
    </Container>
  );
}
