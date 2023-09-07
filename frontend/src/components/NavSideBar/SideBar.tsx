import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import AppBar from "@mui/material/AppBar";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import MailIcon from "@mui/icons-material/Mail";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import WorkIcon from "@mui/icons-material/Work";
import CalculateIcon from "@mui/icons-material/Calculate";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";

const drawerWidth = 240;

const iconList = [
  <CalendarMonthIcon key={0} />,
  <AssignmentIndIcon key={1} />,
  <WorkIcon key={2} />,
  <PeopleAltIcon key={3} />,
  <BeachAccessIcon key={4} />,
  <CalculateIcon key={5} />,
];

export default function SideBar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: "auto" }}>
        <List>
          {[
            "Shifts Schedule",
            "Workers Schedule",
            "Shift Config",
            "Worker Config",
            "Coverage Requi",
            "Constraints",
          ].map((text, index) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemIcon>{iconList[index]}</ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
