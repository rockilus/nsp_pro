import axios from "axios";
// Types
import { TeamWithMembership, toTeamWithMembership } from "@/types/team";

// Env Vars
import { API_URL } from "./env";

const API_BASE_URL = API_URL;

/**
 * Fetches the user's teams with memberships.
 * @returns {Promise<TeamWithMembership[]>} A promise resolving to the list of teams with memberships.
 */
export const getUserTeamsWithMemberships = async (): Promise<
  TeamWithMembership[]
> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teams/with-memberships`);
    return response.data.map((team: any) => toTeamWithMembership(team));
  } catch (error) {
    console.error("Error fetching user teams with memberships:", error);
    throw error;
  }
};
