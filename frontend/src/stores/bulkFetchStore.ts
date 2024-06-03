import { create } from "zustand";
// Stores
import { useAssignmentStore } from "./assignmentStore";
import { useConstraintStore } from "./constraintStore";
import { useConstraintTemplateStore } from "./constraintTemplateStore";
import { useCoverageSelectorStore } from "./coverageSelectorStore";
import { useCoverageStore } from "./coverageStore";
import { useObjectiveBreachStore } from "./objectiveBreachStore";
import { useRequestStore } from "./requestStore";
import { useScheduleStore } from "./scheduleStore";
import { useShiftDimensionStore } from "./shiftDimensionStore";
import { useShiftStore } from "./shiftStore";
import { useSnackBarStore } from "./snackbarStore";
import { useTeamStore } from "./teamStore";
import { useUserStore } from "./userStore";
import { useWorkerDimensionStore } from "./workerDimensionStore";
import { useWorkerStore } from "./workerStore";
// Types
import { BulkT } from "./types";

const apiUrlBulk = process.env.NEXT_PUBLIC_API_URL + "/bulk";

type BulkStateT = {
  fetchBulk: () => void;
};

export const useBulkFetchStore = create<BulkStateT>()((set) => ({
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
        console.log("response not OK");

        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch bulk: " + responseData.detail,
            "error"
          );
        return;
      }
      const bulk: BulkT = responseData;
      useUserStore.getState().fetchUserStore(bulk.user);
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
      useRequestStore.getState().fetchRequestsStore(bulk.requests);
      useCoverageSelectorStore
        .getState()
        .fetchCoverageSelectorsStore(bulk.coverageSelectors);
      useAssignmentStore.getState().fetchAssignmentsStore(bulk.assignments);
      useScheduleStore.getState().fetchScheduleStore(bulk.schedule);
      useObjectiveBreachStore
        .getState()
        .fetchObjectiveBreachesStore(bulk.objectiveBreaches);
    } catch (error) {
      console.log("error caught");

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
