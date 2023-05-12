import React, { useContext, useEffect } from "react";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import LogoutButton from "../components/NavAppBar/LogoutButton";
import SignInDialog from "../components/NavAppBar/SignInDialog";
import SignUpDialog from "../components/NavAppBar/SignUpDialog";
import { AuthContext } from "../context/AuthContext";
import { DoctorsContext } from "../context/DoctorsContext";
import { HospitalContext } from "../context/HospitalContext";

export default function NavAppBar() {
  const authContext = useContext(AuthContext);
  const doctorsContext = useContext(DoctorsContext);
  const hospitalContext = useContext(HospitalContext);

  useEffect(() => {
    console.log("useEffect in NavAppBar for AuthContext");
    async function fetchUserDetails() {
      await authContext.checkAuthStatus();
    }
    if (!authContext.isAuthenticated && !authContext.checkedAuth) {
      console.log("calling checkAuthStatus");
      fetchUserDetails();
    }
  }, [authContext]);

  useEffect(() => {
    async function fetchHospitalInfo(hospitalId: string) {
      await hospitalContext.getHospital(hospitalId);
    }

    console.log("useEffect in NavAppBar for HospitalContext");
    console.log("authContext right after sign in", authContext.currentUser);
    if (
      authContext.currentUser &&
      authContext.currentUser.hospital &&
      !hospitalContext.currentHospital
    ) {
      fetchHospitalInfo(authContext.currentUser.hospital);
    }
  }, [authContext.currentUser, hospitalContext]);

  useEffect(() => {
    console.log("useEffect in NavAppBar for DoctorsContext");
    async function fetchDoctors(hospitalId: string) {
      await doctorsContext.getHospitalUsers(hospitalId);
    }
    if (
      hospitalContext.currentHospital &&
      hospitalContext.currentHospital._id &&
      !doctorsContext.currentDoctors
    ) {
      fetchDoctors(hospitalContext.currentHospital._id);
    }
  }, [hospitalContext.currentHospital, doctorsContext]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            News
          </Typography>
          {authContext.isAuthenticated ? (
            <LogoutButton />
          ) : (
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={1}
            >
              <SignInDialog />
              <SignUpDialog />
            </Stack>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
