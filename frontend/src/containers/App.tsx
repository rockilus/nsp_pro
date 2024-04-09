import React, { useState, useEffect } from "react";
// Components
import NavAppBar from "../components/AppBar/NavAppBar";
import ConstraintTab from "../components/Constraint/ConstraintTab";
import CoverageSelectorTab from "../components/CoverageSelector/CoverageSelectorTab";
import CoverageTab from "../components/Coverage/CoverageTab";
import FARTab from "../components/FixedAssignmentRequest/FARTab";
import ScheduleTab from "../components/Schedule/ScheduleTab";
import ShiftTab from "../components/Shift/ShiftTab";
import SimpleSnackbar from "../components/SnackBars/SnackBars";
import StatsTab from "../components/Stats/StatsTab";
import WorkerTab from "../components/Worker/WorkerTab";
// Stores
import { useConstraintStore } from "../stores/constraintStore";
import { useConstraintTemplateStore } from "../stores/constraintTemplateStore";
import { useCoverageStore } from "../stores/coverageStore";
import { useShiftStore } from "../stores/shiftStore";
import { useShiftDimensionStore } from "../stores/shiftDimensionStore";
import { useTeamStore } from "../stores/teamStore";
import { useWorkerStore } from "../stores/workerStore";
import { useWorkerDimensionStore } from "../stores/workerDimensionStore";
// Types
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
  const shiftDimensions = useShiftDimensionStore(
    (state) => state.shiftDimensions
  );
  const fetchShiftDimensions = useShiftDimensionStore(
    (state) => state.fetchShiftDimensions
  );
  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);
  const workerDimensions = useWorkerDimensionStore(
    (state) => state.workerDimensions
  );
  const fetchWorkerDimensions = useWorkerDimensionStore(
    (state) => state.fetchWorkerDimensions
  );
  const coverages = useCoverageStore((state) => state.coverages);
  const fetchCoverages = useCoverageStore((state) => state.fetchCoverages);

  const teams = useTeamStore((state) => state.teams);
  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const fetchTeams = useTeamStore((state) => state.fetchTeams);
  const setSelectedTeam = useTeamStore((state) => state.setSelectedTeam);
  const constraints = useConstraintStore((state) => state.constraints);
  const fetchConstraints = useConstraintStore(
    (state) => state.fetchConstraints
  );

  const constraintTemplates = useConstraintTemplateStore(
    (state) => state.constraintTemplates
  );
  const fetchConstraintTemplates = useConstraintTemplateStore(
    (state) => state.fetchConstraintTemplates
  );

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
      fetchWorkerDimensions(selectedTeam.id);
      fetchShifts(selectedTeam.id);
      fetchShiftDimensions(selectedTeam.id);
      fetchCoverages(selectedTeam.id);
      fetchConstraints(selectedTeam.id);
      fetchConstraintTemplates(selectedTeam.id);
    }
  }, [
    fetchWorkers,
    fetchWorkerDimensions,
    fetchShifts,
    fetchShiftDimensions,
    fetchCoverages,
    fetchConstraints,
    fetchConstraintTemplates,
    selectedTeam,
  ]);

  const renderTabContent = () => {
    if (!selectedTeam) {
      return null;
    }
    switch (selectedTabId) {
      case "workers":
        return (
          <WorkerTab
            team={selectedTeam}
            workers={workers}
            workerDimensions={workerDimensions}
          />
        );
      case "shifts":
        return (
          <ShiftTab
            team={selectedTeam}
            shifts={shifts}
            shiftDimensions={shiftDimensions}
          />
        );
      case "coverages":
        return (
          <CoverageTab
            team={selectedTeam}
            shifts={shifts}
            coverages={coverages}
          />
        );
      case "constraints":
        return (
          <ConstraintTab
            team={selectedTeam}
            constraints={constraints}
            constraintTemplates={constraintTemplates}
          />
        );
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
      {renderTabContent()}
      <SimpleSnackbar />
    </div>
  );
};

export default App;
