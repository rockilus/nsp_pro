import { create } from "zustand";
// Stores
import { useAssignmentStore } from "./assignmentStore";
import { useSnackBarStore } from "./snackbarStore";
import { useWorkerStore } from "./workerStore";
import { useTeamStore } from "./teamStore";
import { useWorkerDimensionStore } from "./workerDimensionStore";
import { useShiftStore } from "./shiftStore";
import { useShiftDimensionStore } from "./shiftDimensionStore";
import { useCoverageStore } from "./coverageStore";
import { useConstraintStore } from "./constraintStore";
import { useConstraintTemplateStore } from "./constraintTemplateStore";
import { useFixedAssignmentStore } from "./fixedAssignmentStore";
import { useRequestStore } from "./requestStore";
import { useCoverageSelectorStore } from "./coverageSelectorStore";
import { useScheduleStore } from "./scheduleStore";
import { useObjectiveBreachStore } from "./objectiveBreachStore";
import { useStatsOptionsStore } from "./statsOptionsStore";
// Types
import { BulkT } from "./types";

const apiUrlBulk = process.env.NEXT_PUBLIC_API_URL + "/bulk";

type BulkFetchStateT = {
  fetchBulk: () => void;
};

export const useBulkFetchStore = create<BulkFetchStateT>()((set) => ({
  fetchBulk: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlBulk, options);
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch bulk: " + responseData.detail,
            "error"
          );
        return;
      }
      const bulk: BulkT = responseData;
      useTeamStore.getState().fetchTeamsStore(bulk.teams, bulk.selectedTeamId);
      useWorkerStore.getState().fetchWorkersStore(bulk.workers);
      useWorkerDimensionStore
        .getState()
        .fetchWorkerDimensionsStore(bulk.workerDimensions);
      useShiftStore.getState().fetchShiftsStore(bulk.shifts);
      useShiftDimensionStore
        .getState()
        .fetchShiftDimensionsStore(bulk.shiftDimensions);
      useCoverageStore.getState().fetchCoveragesStore(bulk.coverages);
      useConstraintStore.getState().fetchConstraintsStore(bulk.constraints);
      useConstraintTemplateStore
        .getState()
        .fetchConstraintTemplatesStore(bulk.constraintTemplates);
      useFixedAssignmentStore
        .getState()
        .fetchFixedAssignmentsStore(bulk.fixedAssignments);
      useRequestStore.getState().fetchRequestsStore(bulk.requests);
      useCoverageSelectorStore
        .getState()
        .fetchCoverageSelectorsStore(bulk.coverageSelectors);
      useAssignmentStore.getState().fetchAssignmentsStore(bulk.assignments);
      useScheduleStore.getState().fetchSchedulesStore(bulk.schedules);
      useObjectiveBreachStore
        .getState()
        .fetchObjectiveBreachesStore(bulk.objectiveBreaches);
      useStatsOptionsStore.getState().fetchStatsOptionsStore(bulk.statsOptions);
    } catch (error) {
      console.error("Failed to fetch bulk:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch bulk, please try again later",
          "error"
        );
    }
  },
}));
