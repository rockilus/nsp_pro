import React, { useState, useEffect } from "react";
// Components
import NavAppBar from "../components/AppBar/NavAppBar";
import ConstraintTab from "../components/Constraint/ConstraintTab";
import CoverageSelectorTab from "../components/CoverageSelector/CoverageSelectorTab";
import CoverageTab from "../components/Coverage/CoverageTab";
import FARTab from "../components/FixedAssignmentRequest/FARTab";
import ScheduleTab from "../components/Schedule/ScheduleTab";
import ShiftTab from "../components/Shift/ShiftTab";
import SimpleSnackbar from "../utils/SnackBars";
import StatsTab from "../components/Stats/StatsTab";
import WorkerTab from "../components/Worker/WorkerTab";
// Stores
import { useShiftStore } from "../stores/shiftStore";
import { useTeamStore } from "../stores/teamStore";
import { useWorkerStore } from "../stores/workerStore";
// Types
import { ShiftDefaultT } from "../components/Shift/types";
import { ShiftIdNameT, WorkerIdNameT } from "../components/Schedule/types";

const App = () => {
  const tabs = [
    { id: "workers", label: "Workers" },
    { id: "shifts", label: "Shifts" },
    { id: "coverages", label: "Coverages" },
    { id: "constraints", label: "Constraints" },
    { id: "requests", label: "Requests" },
    { id: "cov_selector", label: "Coverage selector" },
    { id: "schedule", label: "Schedule" },
    { id: "stats", label: "Stats" },
  ];

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id); // Get selectedTab from AppBar (if using Context)

  const shifts = useShiftStore((state) => state.shifts);
  const fetchShifts = useShiftStore((state) => state.fetchShifts);
  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);

  const teams = useTeamStore((state) => state.teams);
  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const fetchTeams = useTeamStore((state) => state.fetchTeams);
  const setSelectedTeam = useTeamStore((state) => state.setSelectedTeam);

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [fetchTeams, teams]);

  useEffect(() => {
    if (teams.length > 0) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, setSelectedTeam]);

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
          isTimeOff: s.isTimeOff,
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
    if (selectedTeam) {
      fetchWorkers(selectedTeam.id);
      fetchShifts(selectedTeam.id);
    }
  }, [fetchWorkers, fetchShifts, selectedTeam]);

  const renderTabContent = () => {
    if (!selectedTeam) {
      return null;
    }
    switch (selectedTabId) {
      case "workers":
        return <WorkerTab team={selectedTeam} />;
      case "shifts":
        return <ShiftTab team={selectedTeam} />;
      case "coverages":
        return <CoverageTab team={selectedTeam} shifts={shiftDefaults} />;
      case "constraints":
        return <ConstraintTab team={selectedTeam} />;
      case "requests":
        return (
          <FARTab
            team={selectedTeam}
            workers={workersIdName}
            shifts={shiftsIdName}
          />
        );
      case "cov_selector":
        return <CoverageSelectorTab team={selectedTeam} />;
      case "schedule":
        return (
          <ScheduleTab
            team={selectedTeam}
            workers={workersIdName}
            shifts={shiftsIdName}
          />
        );
      case "stats":
        return (
          <StatsTab
            team={selectedTeam}
            workers={workersIdName}
            shifts={shiftsIdName}
          />
        );
      default:
        return null;
    }
  };

  const handleSelectTab = (tabId: string) => {
    setSelectedTabId(tabId);
  };

  return (
    <div className="app">
      <NavAppBar
        tabs={tabs}
        selectedTabId={selectedTabId}
        handleSelectTab={handleSelectTab}
      />
      {selectedTeam && renderTabContent()}
      <SimpleSnackbar />
    </div>
  );
};

export default App;
