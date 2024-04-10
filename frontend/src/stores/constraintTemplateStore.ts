import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { TemplateT } from "../components/Constraint/types";

const apiUrlConstraints =
  process.env.NEXT_PUBLIC_API_URL + "/constraint-templates";

type ConstraintTemplateStateT = {
  constraintTemplates: TemplateT[];
  fetchConstraintTemplates: (teamId: string) => void;
  fetchConstraintTemplatesStore: (constraintTemplates: TemplateT[]) => void;
};

export const useConstraintTemplateStore = create<ConstraintTemplateStateT>()(
  (set) => ({
    constraintTemplates: [],

    fetchConstraintTemplates: async (teamId) => {
      const options: RequestInit = {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const response = await fetch(
          `${apiUrlConstraints}/teams/${teamId}`,
          options
        );
        const responseData = await response.json();
        if (!response.ok) {
          useSnackBarStore
            .getState()
            .updateSnackBar(
              "Failed to fetch constraint templates: " + responseData.detail,
              "error"
            );
          return;
        }
        const constraintTemplates: TemplateT[] = responseData;
        set({ constraintTemplates });
      } catch (error) {
        console.error("Failed to fetch constraint templates:", error);
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch constraint template, please try again later",
            "error"
          );
        return;
      }
    },

    fetchConstraintTemplatesStore: (constraintTemplates) => {
      set({ constraintTemplates });
    },
  })
);
