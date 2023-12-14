import * as React from "react";

import AssignmentIcon from "@mui/icons-material/Assignment";
import BarChartIcon from "@mui/icons-material/BarChart";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LayersIcon from "@mui/icons-material/Layers";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import PeopleIcon from "@mui/icons-material/People";
import RuleIcon from "@mui/icons-material/Rule";
import WorkIcon from "@mui/icons-material/Work";

interface Props {
  selectedTab: string;
  selectTab: (tabName: string) => void;
}

export const mainListItems = ({ selectedTab, selectTab }: Props) => {
  return (
    <React.Fragment>
      <ListItemButton
        selected={selectedTab === "workers"}
        onClick={() => selectTab("workers")}
      >
        <ListItemIcon>
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText primary="Workers" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "shifts"}
        onClick={() => selectTab("shifts")}
      >
        <ListItemIcon>
          <WorkIcon />
        </ListItemIcon>
        <ListItemText primary="Shifts" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "coverages"}
        onClick={() => selectTab("coverages")}
      >
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Coverages" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "constraints"}
        onClick={() => selectTab("constraints")}
      >
        <ListItemIcon>
          <RuleIcon />
        </ListItemIcon>
        <ListItemText primary="Constraint" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "coverageSelector"}
        onClick={() => selectTab("coverageSelector")}
      >
        <ListItemIcon>
          <DashboardCustomizeIcon />
        </ListItemIcon>
        <ListItemText primary="Coverage Select" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "requests"}
        onClick={() => selectTab("requests")}
      >
        <ListItemIcon>
          <AssignmentIcon />
        </ListItemIcon>
        <ListItemText primary="Requests" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "schedule"}
        onClick={() => selectTab("schedule")}
      >
        <ListItemIcon>
          <CalendarMonthIcon />
        </ListItemIcon>
        <ListItemText primary="Schedule" />
      </ListItemButton>
      <ListItemButton
        selected={selectedTab === "stats"}
        onClick={() => selectTab("stats")}
      >
        <ListItemIcon>
          <BarChartIcon />
        </ListItemIcon>
        <ListItemText primary="Stats" />
      </ListItemButton>
    </React.Fragment>
  );
};

export const secondaryListItems = ({ selectedTab, selectTab }: Props) => {
  return (
    <React.Fragment>
      <ListSubheader component="div" inset>
        Admin
      </ListSubheader>
      <ListItemButton
        selected={selectedTab === "admin"}
        onClick={() => selectTab("admin")}
      >
        <ListItemIcon>
          <LayersIcon />
        </ListItemIcon>
        <ListItemText primary="Roles/Permissions" />
      </ListItemButton>
    </React.Fragment>
  );
};
