import { create } from "zustand";
// Types
import { TeamT } from "../containers/types";
// Constants
import { ApiUrl } from "../utils/env_config";

const apiUrlTeam = ApiUrl + "/teams";

type TeamStateT = {
  teams: TeamT[];
  fetchTeams: () => void;
  clearTeams: () => void;
};

export const useTeamStore = create<TeamStateT>()((set) => ({
  teams: [],

  fetchTeams: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include",
    };
    try {
      const response = await fetch(apiUrlTeam, options);
      if (response.ok) {
        const teams: TeamT[] = await response.json();
        set({ teams: teams });
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  },

  clearTeams: () => {
    set({ teams: [] });
  },
}));
