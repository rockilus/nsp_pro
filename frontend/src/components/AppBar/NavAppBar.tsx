import * as React from "react";
// MUI
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import AdbIcon from "@mui/icons-material/Adb";
import Image from "next/image";
//Components
import TabButton from "./TabButton";
import AccountMenu from "./AccountMenu";

interface Props {
  tabs: { id: string; label: string }[];
  selectedTabId: string;
  handleSelectTab: (tabId: string) => void;
}

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const NavAppBar = ({ tabs, selectedTabId, handleSelectTab }: Props) => {
  return (
    <AppBar position="static" sx={{ backgroundColor: "white" }}>
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
          <Box display="flex" justifyContent="center" alignItems="center">
            {/* <div style={{ display: "flex", justifyContent: "space-evenly" }}> */}
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isSelected={tab.id === selectedTabId}
                handleSelectTab={handleSelectTab}
              />
            ))}
          </Box>
          {/* </div> */}
          <AccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBar;
