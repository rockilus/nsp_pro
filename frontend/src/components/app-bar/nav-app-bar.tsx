"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import useMediaQuery from "@mui/material/useMediaQuery";
//Components
import AccountMenu from "./account-menu";
import NavLinks, { NavLinksMobile } from "./nav-links";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "./nav-app-bar.css";

dayjs.extend(utc);

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const NavAppBar = ({ lng }: { lng: string }) => {
  const { selectedTeam } = useTeam();
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width:600px)");

  // Provide default settings for the schedule view hook.
  const defaultSettings = useMemo(() => {
    try {
      // import dynamically to avoid static cycles

      const util = require("@/app/lib/utils/scheduleViewSettingsUtils");
      return util.getDefaultScheduleViewSettings(
        selectedTeam?.team.useSolver ?? false
      );
    } catch (err) {
      return undefined;
    }
  }, [selectedTeam]);

  // useScheduleViewSettings expects (teamId, defaults). Use a safe fallback team id.

  const useScheduleViewSettings =
    require("@/app/lib/hooks/useScheduleViewSettings").useScheduleViewSettings;
  const teamId = selectedTeam?.team.id ?? "no_team";
  const [scheduleViewSettings, updateScheduleViewSettings] =
    useScheduleViewSettings(
      teamId,
      defaultSettings || {
        timeFrame: "week",
        periodStartDate: dayjs.utc().startOf("isoWeek"),
        groupBy: "shift",
        showBreaches: true,
        showAssignments: true,
        showDailyShiftDemands: false,
        showRequests: true,
      }
    );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isScheduleRoute = Boolean(
    pathname?.endsWith("/schedule") || pathname?.endsWith("/schedule/")
  );

  const monthLabel = (() => {
    try {
      const periodStart = scheduleViewSettings?.periodStartDate;
      const now = dayjs.utc();
      if (!periodStart) return "";
      if (periodStart.year() === now.year()) {
        return periodStart.format("MMMM");
      }
      return periodStart.format("MMM YYYY");
    } catch (err) {
      return "";
    }
  })();

  const handleToday = () => {
    const today = dayjs.utc();
    const newStart =
      scheduleViewSettings?.timeFrame === "month"
        ? today.startOf("month")
        : today.startOf("isoWeek");
    updateScheduleViewSettings({ periodStartDate: newStart });
  };

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
        {isMobile ? (
          <div className="app-bar-content-container">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
              {isScheduleRoute ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {monthLabel}
                  </Typography>
                  <IconButton
                    onClick={() => setSettingsOpen(true)}
                    size="small"
                  >
                    <SettingsIcon />
                  </IconButton>
                  <Button
                    onClick={handleToday}
                    sx={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: "50%",
                      padding: 0,
                    }}
                  >
                    {dayjs.utc().format("D")}
                  </Button>
                </Box>
              ) : (
                <img
                  src="/rockilus_logo_blue.jpg"
                  alt="logo"
                  width={logoWidth}
                  height={logoHeight}
                />
              )}
            </Box>

            <AccountMenu lng={lng} />

            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
            >
              <Box
                sx={{ width: 260, p: 2 }}
                role="presentation"
                onClick={() => setDrawerOpen(false)}
              >
                <NavLinksMobile
                  lng={lng}
                  selectedTeam={selectedTeam}
                  onClick={() => setDrawerOpen(false)}
                />
              </Box>
            </Drawer>

            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
              <DialogTitle>Settings</DialogTitle>
              <DialogActions>
                <Button onClick={() => setSettingsOpen(false)}>Close</Button>
              </DialogActions>
            </Dialog>
          </div>
        ) : (
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
        )}
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBar;
