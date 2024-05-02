import React, { useState, useEffect, useCallback } from "react";
// Components
import NavAppBar from "../components/AppBar/NavAppBar";
import ConstraintTab from "../components/Constraint/ConstraintTab";
import CoverageSelectorTab from "../components/CoverageSelector/CoverageSelectorTab";
import CoverageTab from "../components/Coverage/CoverageTab";
import RequestTab from "../components/Request/RequestTab";
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
import { useObjectiveBreachStore } from "../stores/objectiveBreachStore";
import { useRequestStore } from "../stores/requestStore";
import { useScheduleStore } from "../stores/scheduleStore";
import { useShiftStore } from "../stores/shiftStore";
import { useShiftDimensionStore } from "../stores/shiftDimensionStore";
import { useTeamStore } from "../stores/teamStore";
import { useWorkerStore } from "../stores/workerStore";
import { useWorkerDimensionStore } from "../stores/workerDimensionStore";
import { useBulkFetchStore } from "../stores/bulkFetchStore";
// Types
import { StatsShiftOptionsT } from "../components/Stats/types";
import { TemplateT } from "../components/Constraint/types";
import { ScheduleT } from "../components/Schedule/types";

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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchBulk = useBulkFetchStore((state) => state.fetchBulk);

  const teams = useTeamStore((state) => state.teams);
  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const workers = useWorkerStore((state) => state.workers);
  const workerDimensions = useWorkerDimensionStore(
    (state) => state.workerDimensions
  );
  const shifts = useShiftStore((state) => state.shifts);
  const shiftDimensions = useShiftDimensionStore(
    (state) => state.shiftDimensions
  );
  const coverages = useCoverageStore((state) => state.coverages);
  const constraints = useConstraintStore((state) => state.constraints);
  const constraintTemplates = useConstraintTemplateStore(
    (state) => state.constraintTemplates
  );
  const requests = useRequestStore((state) => state.requests);
  const coverageSelectors = useCoverageSelectorStore(
    (state) => state.coverageSelectors
  );
  const schedule = useScheduleStore((state) => state.schedule);
  const assignments = useAssignmentStore((state) => state.assignments);
  const objectiveBreaches = useObjectiveBreachStore(
    (state) => state.objectiveBreaches
  );

  const findShiftBlock = (templates: TemplateT[]): StatsShiftOptionsT => {
    for (let template of templates) {
      for (let block of template.blocks) {
        if (block.name === "shift") {
          return block.options as StatsShiftOptionsT;
        }
      }
    }
    return {};
  };

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    await fetchBulk();
    setIsLoading(false);
  }, [fetchBulk]);

  useEffect(() => {
    if (teams.length === 0) {
      fetchInitialData();
    }
  }, [fetchInitialData, teams]);

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
          <RequestTab
            team={selectedTeam}
            workers={workers}
            shifts={shifts}
            requests={requests}
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
            schedule={schedule}
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
            statsShiftOptions={findShiftBlock(constraintTemplates)}
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
