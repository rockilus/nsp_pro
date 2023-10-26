// constraintTreeStore.ts
import { create } from "zustand";
import { TreeNodeT } from "../components/Constraint/types";

const baseApiUrl = "http://127.0.0.1:5000";
const apiUrlConstraintTree = baseApiUrl + "/constraint-tree";

type ConstraintTreeStateT = {
  constraintTree: TreeNodeT;
  fetchConstraintTree: () => void;
};

export const useConstraintTreeStore = create<ConstraintTreeStateT>()((set) => ({
  constraintTree: {
    name: "",
    parentOptions: [],
    options: [],
    children: [],
  },

  fetchConstraintTree: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    try {
      const response = await fetch(apiUrlConstraintTree, options); // Adjust API endpoint as needed
      const constraintTree: TreeNodeT = await response.json();
      set({ constraintTree });
    } catch (error) {
      console.error("Failed to fetch constraint tree:", error);
    }
  },
}));
