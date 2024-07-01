import * as React from "react";
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
import { sendEmailClicked, StateReset } from "../../app/lib/authentication";

export default function SendResetPassword() {
  const initialState: StateReset = { message: null, errors: {} };
  const [state, dispatch] = useFormState(sendEmailClicked, initialState);

  console.log("state", state);

  const handleClearEmailErrors = () => {
    dispatch("CLEAR_EMAIL_ERROR");
  };

  const handleClearEmailSuccess = () => {
    dispatch("CLEAR_EMAIL_SUCCESS");
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
        {state?.message === "success" ? (
          <div>
            <Typography variant="body1">
              A password reset email has been sent to your email address.
            </Typography>
            <Grid container>
              <Grid item xs>
                <Link
                  onClick={handleClearEmailSuccess}
                  variant="body2"
                  sx={{ cursor: "pointer" }}
                >
                  Resend or change email
                </Link>
              </Grid>
              <Grid item>
                <Link variant="body2" href="/auth" sx={{ cursor: "pointer" }}>
                  {"Back to sign in"}
                </Link>
              </Grid>
            </Grid>
          </div>
        ) : (
          <div>
            <Typography component="h1" variant="h5">
              Reset password
            </Typography>
            <Typography variant="body1">
              We will send you an email to reset your password
            </Typography>
            <Box component="form" sx={{ mt: 1 }} action={dispatch}>
              <TextField
                error={!!state?.errors?.email}
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                helperText={state?.errors?.email?.join(", ")}
                onChange={handleClearEmailErrors}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
              >
                Send email
              </Button>

              <Grid container>
                <Grid item xs></Grid>
                <Grid item>
                  <Link variant="body2" href="/auth" sx={{ cursor: "pointer" }}>
                    {"Back to sign in"}
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </div>
        )}
      </Box>
    </Container>
  );
}
