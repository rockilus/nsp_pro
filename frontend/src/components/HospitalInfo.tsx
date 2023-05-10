import React, { useState, useContext } from "react";

import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import { AuthContext } from "../context/AuthContext";
import { HospitalContext } from "../context/HospitalContext";

const theme = createTheme();

export default function HospitalInfo() {
  const [hospitalName, setHospitalName] = useState("");
  const authContext = useContext(AuthContext);
  const hospitalContext = useContext(HospitalContext);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("authContext.currentUser._id", authContext);

    if (authContext.currentUser) {
      await hospitalContext.createNewHospital(
        hospitalName,
        authContext.currentUser._id
      );
    }
  };

  //   const fetchHospitalInfo = async () => {
  //     const response = await getHospitalInfo();
  //     console.log("response useEffect", response);
  //     setHospitalInfo(response);
  //   };

  return (
    <ThemeProvider theme={theme}>
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
          <Typography component="h1" variant="h5">
            Hospital Info
          </Typography>
          <Box
            component="form"
            noValidate
            onSubmit={handleSubmit}
            sx={{ mt: 3 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="hospitalName"
                  required
                  fullWidth
                  id="hospitalName"
                  label="Hospital Name"
                  autoFocus
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
