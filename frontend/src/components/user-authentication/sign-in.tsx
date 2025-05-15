"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
// Lib
import { signInClicked, State } from "../../app/lib/authentication";

export default function SignIn({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "auth-page");

  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useFormState(signInClicked, initialState);

  const pathName = usePathname();
  const { replace } = useRouter();

  const handleGoToSignUp = () => {
    const params = new URLSearchParams();
    params.set("show", "signup");
    replace(`${pathName}?${params.toString()}`);
  };

  const handleClearEmailErrors = () => {
    dispatch("CLEAR_EMAIL_ERROR");
  };

  const handleClearPasswordErrors = () => {
    dispatch("CLEAR_PASSWORD_ERROR");
  };

  const [showPassword, setShowPassword] = React.useState(false);
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

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
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          {t("sign_in")}
        </Typography>
        <Box component="form" sx={{ mt: 1 }} action={dispatch}>
          <TextField
            error={!!state?.errors?.email}
            margin="normal"
            required
            fullWidth
            id="email"
            label={t("email_address")}
            name="email"
            autoComplete="email"
            autoFocus
            helperText={state?.errors?.email?.join(", ")}
            onChange={handleClearEmailErrors}
          />
          <TextField
            error={!!state?.errors?.password}
            margin="normal"
            required
            fullWidth
            name="password"
            label={t("password")}
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="current-password"
            helperText={state?.errors?.password?.join(", ")}
            onChange={handleClearPasswordErrors}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {t("sign_in")}
          </Button>
          <Grid container>
            <Grid item xs>
              <Link href="/auth/reset-password" variant="body2">
                {t("forgot_password")}
              </Link>
            </Grid>
            <Grid item>
              <Link
                variant="body2"
                onClick={handleGoToSignUp}
                sx={{ cursor: "pointer" }}
              >
                {t("to_sign_up")}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}
