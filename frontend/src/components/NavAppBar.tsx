import React, { useContext, useEffect } from "react";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import LogoutButton from "./LogoutButton";
import SignInDialog from "./SignInDialog";
import SignUpDialog from "./SignUpDialog";
import { AuthContext } from "../context/AuthContext";

export default function NavAppBar() {
  const authContext = useContext(AuthContext);

  // useEffect(() => {
  //   if (!userContext.details) {
  //     console.log("user details do not exist");

  //     async function fetchUserDetails() {
  //       console.log("getting user details");
  //       const response = await getUserDetails();
  //       if (response) {
  //         console.log(response);
  //         setUserContext((oldValues: any) => {
  //           return { ...oldValues, details: response };
  //         });
  //       }
  //     }
  //     fetchUserDetails();
  //   } else {
  //     console.log("user details already exist");
  //   }
  // }, [userContext.details, setUserContext]);

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
