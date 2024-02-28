import React, { useEffect } from "react";
// MUI
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
// Components
import AppBarDash from "./AppBarDash";
import DrawerDash from "./DrawerDash";
import ConstraintTab from "../Constraint/ConstraintTab";
import CoverageSelectorTab from "../CoverageSelector/CoverageSelectorTab";
import CoverageTab from "../Coverage/CoverageTab";
import FARTab from "../FixedAssignmentRequest/FARTab";
import ScheduleTab from "../Schedule/ScheduleTab";
import ShiftTab from "../Shift/ShiftTab";
import StatsTab from "../Stats/StatsTab";
import WorkerTab from "../Worker/WorkerTab";
// Stores
import { useShiftStore } from "../../stores/shiftStore";
import { useWorkerStore } from "../../stores/workerStore";
// Types
import { ShiftDefaultT } from "../Shift/types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { TeamT } from "../../containers/types";

// TODO remove, this demo shouldn't need to reset the theme.
const defaultTheme = createTheme();
interface Props {
  team: TeamT;
}

export default function Dashboard({ team }: Props) {
  const [selectedTab, setSelectedTab] = React.useState<string>("workers");
  const [open, setOpen] = React.useState<boolean>(false);

  const toggleDrawer = () => {
    setOpen(!open);
  };
  const selectTab = (tabName: string) => {
    setSelectedTab(tabName);
  };

  const shifts = useShiftStore((state) => state.shifts);
  const fetchShifts = useShiftStore((state) => state.fetchShifts);
  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);

  const shiftDefaults = shifts
    ? shifts.map((s) => {
        const shift: ShiftDefaultT = {
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          isTimeOff: s.isTimeOff,
          staffing: s.staffing,
          color: s.color,
        };
        return shift;
      })
    : [];

  const shiftsIdName = shifts
    ? shifts.map((s) => {
        const shift: ShiftIdNameT = {
          id: s.id,
          name: s.name,
        };
        return shift;
      })
    : [];

  const workersIdName = workers
    ? workers.map((w) => {
        const worker: WorkerIdNameT = {
          id: w.id,
          name: w.name,
        };
        return worker;
      })
    : [];

  useEffect(() => {
    fetchShifts(team.id);
    fetchWorkers(team.id);
  }, [fetchShifts, fetchWorkers, team.id]);

  const tabs: { [key: string]: JSX.Element } = {
    workers: <WorkerTab team={team} />,
    shifts: <ShiftTab team={team} />,
    coverages: <CoverageTab team={team} shifts={shiftDefaults} />,
    constraints: <ConstraintTab team={team} />,
    requests: (
      <FARTab team={team} workers={workersIdName} shifts={shiftsIdName} />
    ),
    coverageSelector: <CoverageSelectorTab team={team} />,
    schedule: (
      <ScheduleTab team={team} workers={workersIdName} shifts={shiftsIdName} />
    ),
    stats: <StatsTab workers={workersIdName} shifts={shiftsIdName} />,
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBarDash open={open} toggleDrawer={toggleDrawer} />
        <DrawerDash
          open={open}
          selectedTab={selectedTab}
          toggleDrawer={toggleDrawer}
          selectTab={selectTab}
        />
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: "100vh",
            overflow: "auto",
          }}
        >
          <Toolbar />
          {tabs[selectedTab]}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
