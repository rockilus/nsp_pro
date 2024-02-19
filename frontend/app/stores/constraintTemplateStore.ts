// constraintTemplateStore.ts
import { create } from "zustand";
import { TemplateT } from "../components/Constraint/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlConstraints = baseApiUrl + "/constraint-templates";

type ConstraintTemplateStateT = {
  constraintTemplates: TemplateT[];
  fetchConstraintTemplates: () => void;
};

export const useConstraintTemplateStore = create<ConstraintTemplateStateT>()(
  (set) => ({
    constraintTemplates: [],

    fetchConstraintTemplates: async () => {
      const options: RequestInit = {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      };
      try {
        const response = await fetch(`${apiUrlConstraints}`, options); // Adjust API endpoint as needed
        const constraintTemplates: TemplateT[] = await response.json();
        set({ constraintTemplates });
      } catch (error) {
        console.error("Failed to fetch constraint templates:", error);
      }
    },
  })
);
