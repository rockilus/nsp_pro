import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { AssignmentT } from "../components/Schedule/types";

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
            "Failed to fetch assignments: " + responseData.detail,
            "error"
          );
        return;
      }
      const assignments: AssignmentT[] = responseData.map(toAssignmentT);
      set({ assignments });
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch assignments, please try again later",
          "error"
        );
    }
  },
}));
