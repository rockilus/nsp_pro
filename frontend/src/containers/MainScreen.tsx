import * as React from "react";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import NavAppBarProto from "../components/NavSideBar/NavAppBarProto";
import ShiftTable from "../components/NavSideBar/ShiftTable";
import ShiftConfiguration from "../components/DraftComponents/ShiftConfiguration";
import SideBar from "../components/NavSideBar/SideBar";
import WorkerConfig from "../components/DraftComponents/WorkerConfig";

export default function MainScreen() {
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <NavAppBarProto />
      <SideBar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {/* <ShiftConfiguration /> */}
        <WorkerConfig />
      </Box>
    </Box>
  );
}
