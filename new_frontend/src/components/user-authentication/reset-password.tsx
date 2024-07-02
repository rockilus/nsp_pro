"use client";

import * as React from "react";
import { useFormState } from "react-dom";
// MUI
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
// Lib
import {
  newPasswordEntered,
  StateNewPassword,
} from "../../app/lib/authentication";

export default function ResetPassword() {
  const initialState: StateNewPassword = { message: null, errors: {} };
  const [state, dispatch] = useFormState(newPasswordEntered, initialState);

  console.log("state", state);

  const handleClearPasswordErrors = () => {
    dispatch("CLEAR_PASSWORD_ERROR");
  };

  const handleClearPasswordConfirmErrors = () => {
    dispatch("CLEAR_PASSWORD_CONFIRM_ERROR");
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />

      {state?.message === "success" ? (
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Success
          </Typography>
          <Typography variant="body1">
            Your password was successfully changed.
          </Typography>
          <Box component="form" sx={{ mt: 1 }}>
            <Button
              fullWidth
              href="/auth"
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign in
            </Button>
          </Box>
        </Box>
      ) : state?.message === "invalidToken" ? (
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Invalid token
          </Typography>
          <Typography variant="body1">
            Your reset password token expired, please try again.
          </Typography>
          <Box component="form" sx={{ mt: 1 }}>
            <Button
              fullWidth
              href="/auth"
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign in
            </Button>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Reset password
          </Typography>
          <Typography variant="body1">
            Enter a new password for your account.
          </Typography>
          <Box component="form" sx={{ mt: 1 }} action={dispatch}>
            <TextField
              error={!!state?.errors?.password}
              margin="normal"
              required
              fullWidth
              name="password"
              label="New password"
              type="password"
              id="password"
              autoComplete="new-password"
              helperText={state?.errors?.password?.join(", ")}
              onChange={handleClearPasswordErrors}
            />
            <TextField
              error={!!state?.errors?.passwordConfirm}
              margin="normal"
              required
              fullWidth
              name="passwordConfirm"
              label="Confirm password"
              type="password"
              id="passwordConfirm"
              autoComplete="new-password"
              helperText={state?.errors?.passwordConfirm?.join(", ")}
              onChange={handleClearPasswordConfirmErrors}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Change password
            </Button>
          </Box>
        </Box>
      )}
    </Container>
  );
}
