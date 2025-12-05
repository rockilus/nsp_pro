"use client";

import * as React from "react";
// MUI
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
// Components
import AccountMenu from "./account-menu";
import NavLinks from "./nav-links";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "./nav-app-bar.css";

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const NavAppBar = ({ lng }: { lng: string }) => {
  const { selectedTeam } = useTeam();

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "white",
        boxShadow: "none",
        borderBottom: "1px solid lightgray",
      }}
    >
      <Toolbar sx={{ height: "64px", padding: "0 12px" }}>
        <div className="app-bar-content-container">
          <img
            src="/rockilus_logo_blue.jpg"
            alt="logo"
            width={logoWidth}
            height={logoHeight}
          />
          <NavLinks lng={lng} selectedTeam={selectedTeam} />
          <AccountMenu lng={lng} />
        </div>
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBar;
