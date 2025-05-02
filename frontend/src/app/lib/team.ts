import axios from "axios";
// Types
import {
  TeamT,
  TeamWithMembership,
  toTeamtT,
  toTeamWithMembership,
} from "@/types/team";

// Env Vars
import { API_URL } from "./env";

const API_BASE_URL = API_URL;

/**
 * Sends a request to create a new team.
 * @param {string} teamName - The name of the team to create.
 * @returns {Promise<TeamT>} A promise resolving to the created team.
 */
export const createTeam = async (teamName: string): Promise<TeamT> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/teams`, {
      team_name: teamName,
    });
    return toTeamtT(response.data);
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
};

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

/**
 * Sends a request to leave a team.
 * @param {string} teamId - The ID of the team to leave.
 * @returns {Promise<boolean>} A promise resolving to true if the request was successful.
 */
export const leaveTeam = async (teamId: string): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE_URL}/teams/${teamId}/leave`);
    return true;
  } catch (error) {
    console.error("Error leaving team:", error);
    return false;
  }
};
