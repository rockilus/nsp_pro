"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFormState } from "react-dom";
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
// Lib
import { signUpClicked, State } from "@/app/lib/authentication";

// function Copyright(props: any) {
//   return (
//     <Typography
//       variant="body2"
//       color="text.secondary"
//       align="center"
//       {...props}
//     >
//       {"Copyright © "}
//       <Link color="inherit" href="https://mui.com/">
//         Your Website
//       </Link>{" "}
//       {new Date().getFullYear()}
//       {"."}
//     </Typography>
//   );
// }

export default function SignUp() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useFormState(signUpClicked, initialState);
  console.log("state", state);

  const pathName = usePathname();
  const { replace } = useRouter();

  const handleGoToSignIn = () => {
    const params = new URLSearchParams();
    params.set("show", "signin");
    replace(`${pathName}?${params.toString()}`);
  };

  const handleClearEmailErrors = () => {
    dispatch("CLEAR_EMAIL_ERROR");
  };

  const handleClearPasswordErrors = () => {
    dispatch("CLEAR_PASSWORD_ERROR");
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
          Sign up
        </Typography>
        <Box component="form" action={dispatch} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            {/* <Grid item xs={12} sm={6}>
                <TextField
                  autoComplete="given-name"
                  name="firstName"
                  required
                  fullWidth
                  id="firstName"
                  label="First Name"
                  autoFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  name="lastName"
                  autoComplete="family-name"
                />
              </Grid> */}
            <Grid item xs={12}>
              <TextField
                error={!!state?.errors?.email}
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                helperText={state?.errors?.email?.join(", ")}
                onChange={handleClearEmailErrors}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                error={!!state?.errors?.password}
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                helperText={state?.errors?.password?.join(", ")}
                onChange={handleClearPasswordErrors}
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign Up
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link
                variant="body2"
                onClick={handleGoToSignIn}
                sx={{ cursor: "pointer" }}
              >
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      {/* <Copyright sx={{ mt: 5 }} /> */}
    </Container>
  );
}
