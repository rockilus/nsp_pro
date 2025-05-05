import * as React from "react";
// MUI
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Image from "next/image";
//Components
import AccountMenu from "./account-menu";
import NavLinks from "./nav-links";
// Styles
import "./nav-app-bar.css";

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const NavAppBar = ({ lng }: { lng: string }) => {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "white",
        boxShadow: "none",
        borderBottom: "1px solid lightgray",
      }}
    >
      <Toolbar
        sx={{
          height: "64px",
          padding: "0 24px",
        }}
      >
        <div className="app-bar-content-container">
          <Image
            src="/rockilus_logo_blue.jpg"
            alt="logo"
            width={logoWidth}
            height={logoHeight}
            priority
          />
          <NavLinks lng={lng} />
          <AccountMenu lng={lng} />
        </div>
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBar;
