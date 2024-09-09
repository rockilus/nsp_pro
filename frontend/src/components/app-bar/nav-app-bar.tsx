import * as React from "react";
// MUI
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Image from "next/image";
//Components
import AccountMenu from "./account-menu";
import NavLinks from "./nav-links";

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
      <Toolbar>
        <Box
          display="flex"
          justifyContent="space-between"
          width="100%"
          alignItems="center"
        >
          <Image
            src="/logo.png"
            alt="logo"
            width={logoWidth}
            height={logoHeight}
            priority
          />
          <NavLinks lng={lng} />
          <AccountMenu lng={lng} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBar;
