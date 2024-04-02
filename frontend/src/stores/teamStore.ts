import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { TeamT } from "../containers/types";

const apiUrlTeam = process.env.NEXT_PUBLIC_API_URL + "/teams";

type TeamStateT = {
  teams: TeamT[];
  selectedTeam: TeamT | null;
  fetchTeams: () => void;
  clearTeams: () => void;
  setSelectedTeam: (team: TeamT | null) => void;
};

export const useTeamStore = create<TeamStateT>()((set) => ({
  teams: [],
  selectedTeam: null,

  fetchTeams: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include",
    };
    try {
      const response = await fetch(apiUrlTeam, options);
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch teams: " + responseData.detail,
            "error"
          );
        return;
      }
      const teams: TeamT[] = responseData;
      set({ teams: teams });
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch teams, please try again later",
          "error"
        );
    }
  },

  clearTeams: () => {
    set({ teams: [] });
  },

  setSelectedTeam: (team: TeamT | null) => {
    set({ selectedTeam: team });
  },
}));
