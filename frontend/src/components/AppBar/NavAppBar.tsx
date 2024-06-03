import * as React from "react";
// MUI
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Image from "next/image";
//Components
import TabButton from "./TabButton";
import AccountMenu from "./AccountMenu";

interface Props {
  tabs: { id: string; label: string; type: string }[];
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
            {tabs
              .filter((t) => t.type === "core")
              .map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  isSelected={tab.id === selectedTabId}
                  handleSelectTab={handleSelectTab}
                />
              ))}
          </Box>
          {/* </div> */}
          <AccountMenu tabs={tabs} handleSelectTab={handleSelectTab} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBar;
