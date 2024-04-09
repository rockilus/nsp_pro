import React, { useState, useEffect, useCallback } from "react";
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
import { useAssignmentStore } from "../stores/assignmentStore";
import { useConstraintStore } from "../stores/constraintStore";
import { useConstraintTemplateStore } from "../stores/constraintTemplateStore";
import { useCoverageSelectorStore } from "../stores/coverageSelectorStore";
import { useCoverageStore } from "../stores/coverageStore";
import { useFixedAssignmentStore } from "../stores/fixedAssignmentStore";
import { useObjectiveBreachStore } from "../stores/objectiveBreachStore";
import { useRequestStore } from "../stores/requestStore";
import { useScheduleStore } from "../stores/scheduleStore";
import { useShiftStore } from "../stores/shiftStore";
import { useShiftDimensionStore } from "../stores/shiftDimensionStore";
import { useStatsOptionsStore } from "../stores/statsOptionsStore";
import { useTeamStore } from "../stores/teamStore";
import { useWorkerStore } from "../stores/workerStore";
import { useWorkerDimensionStore } from "../stores/workerDimensionStore";
// Types
import {
  FixedAssignmentT,
  RequestT,
  FarT,
} from "../components/FixedAssignmentRequest/types";

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
  const [fars, setFars] = useState<FarT[]>([]);
  const fixedAssignments = useFixedAssignmentStore(
    (state) => state.fixedAssignments
  );
  const requests = useRequestStore((state) => state.requests);
  const fetchFixedAssignments = useFixedAssignmentStore(
    (state) => state.fetchFixedAssignments
  );
  const fetchRequests = useRequestStore((state) => state.fetchRequests);
  const coverageSelectors = useCoverageSelectorStore(
    (state) => state.coverageSelectors
  );
  const fetchCoverageSelectors = useCoverageSelectorStore(
    (state) => state.fetchCoverageSelectors
  );
  const schedules = useScheduleStore((state) => state.schedules);
  const fetchSchedules = useScheduleStore((state) => state.fetchSchedules);
  const assignments = useAssignmentStore((state) => state.assignments);
  const fetchAssignments = useAssignmentStore(
    (state) => state.fetchAssignments
  );
  const objectiveBreaches = useObjectiveBreachStore(
    (state) => state.objectiveBreaches
  );
  const fetchObjectiveBreaches = useObjectiveBreachStore(
    (state) => state.fetchObjectiveBreaches
  );
  const statsOptions = useStatsOptionsStore((state) => state.statsOptions);
  const fetchStatsOptions = useStatsOptionsStore(
    (state) => state.fetchStatsOptions
  );

  const FixedAssignmentToFar = (fa: FixedAssignmentT): FarT => {
    const far: FarT = {
      ...fa,
      priority: "",
      isFA: true,
    };
    return far;
  };
  const RequestoFar = (r: RequestT) => {
    const far: FarT = {
      ...r,
      isFA: false,
    };
    return far;
  };

  const buildFarsArray = useCallback(
    (fixedAssignments: FixedAssignmentT[], requests: RequestT[]): FarT[] => {
      const fars: FarT[] = [
        ...fixedAssignments.map(FixedAssignmentToFar),
        ...requests.map(RequestoFar),
      ];
      return fars.sort((a, b) => {
        return a.date.getTime() - b.date.getTime();
      });
    },
    []
  );

  useEffect(() => {
    setFars(buildFarsArray(fixedAssignments, requests));
  }, [fixedAssignments, requests, buildFarsArray]);

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

  useEffect(() => {
    if (selectedTeam) {
      fetchWorkers(selectedTeam.id);
      fetchWorkerDimensions(selectedTeam.id);
      fetchShifts(selectedTeam.id);
      fetchShiftDimensions(selectedTeam.id);
      fetchCoverages(selectedTeam.id);
      fetchConstraints(selectedTeam.id);
      fetchConstraintTemplates(selectedTeam.id);
      fetchFixedAssignments(selectedTeam.id);
      fetchRequests(selectedTeam.id);
      fetchCoverageSelectors(selectedTeam.id);
      fetchAssignments(selectedTeam.id);
      fetchSchedules(selectedTeam.id);
      fetchObjectiveBreaches(selectedTeam.id);
      fetchStatsOptions(selectedTeam.id);
    }
  }, [
    fetchWorkers,
    fetchWorkerDimensions,
    fetchShifts,
    fetchShiftDimensions,
    fetchCoverages,
    fetchConstraints,
    fetchConstraintTemplates,
    fetchFixedAssignments,
    fetchRequests,
    fetchCoverageSelectors,
    fetchAssignments,
    fetchSchedules,
    fetchObjectiveBreaches,
    fetchStatsOptions,
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
            workers={workers}
            shifts={shifts}
            fars={fars}
          />
        );
      case "cov_selector":
        return (
          <CoverageSelectorTab
            team={selectedTeam}
            coverageSelectors={coverageSelectors}
            coverages={coverages}
          />
        );
      case "schedule":
        return (
          <ScheduleTab
            team={selectedTeam}
            workers={workers}
            shifts={shifts}
            schedules={schedules}
            assignments={assignments}
            objectiveBreaches={objectiveBreaches}
          />
        );
      case "stats":
        return (
          <StatsTab
            team={selectedTeam}
            workers={workers}
            shifts={shifts}
            statsOptions={statsOptions}
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
