import axios from "axios";
// Types
import {
  TeamT,
  TeamWithMembership,
  toTeamtT,
  toTeamWithMembership,
  fromTeamT,
} from "@/types/team";
import { UserWithMembership, toUserWithMembership } from "@/types/user";
// Env Vars
import { API_URL } from "./env";

const API_BASE_URL = API_URL;

/**
 * Sends a request to create a new team.
 * @param {string} teamName - The name of the team to create.
 * @returns {Promise<TeamT>} A promise resolving to the created team.
 */
export const createTeam = async (
  teamName: string
): Promise<TeamWithMembership> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/teams`, {
      team_name: teamName,
    });
    return toTeamWithMembership(response.data);
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
};

/**
 * Fetches a team by its ID.
 * @param {string} teamId - The ID of the team to fetch.
 * @returns {Promise<TeamT>} A promise resolving to the fetched team.
 */
export const getTeamById = async (teamId: string): Promise<TeamT> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teams/${teamId}`);
    return toTeamtT(response.data);
  } catch (error) {
    console.error("Error fetching team by ID:", error);
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
 * Fetches the users of a team with their memberships.
 * @param {string} teamId - The ID of the team to fetch users for.
 * @returns {Promise<UserWithMembership[]>} A promise resolving to the list of users with memberships.
 */
export const getTeamUsersWithMemberships = async (
  teamId: string
): Promise<UserWithMembership[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teams/${teamId}/users`);
    return response.data.map((user: any) => toUserWithMembership(user));
  } catch (error) {
    console.error("Error fetching team users with memberships:", error);
    throw error;
  }
};

/**
 * Updates a team by its ID.
 * @param {string} teamId - The ID of the team to update.
 * @param {TeamT} teamData - The updated team data.
 * @returns {Promise<TeamT>} A promise resolving to the updated team.
 */
export const updateTeamById = async (
  teamId: string,
  teamData: TeamT
): Promise<TeamT> => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/teams/${teamId}`,
      fromTeamT(teamData)
    );
    return toTeamtT(response.data);
  } catch (error) {
    console.error("Error updating team by ID:", error);
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

/**
 * Sends a request to remove a user from a team.
 * @param {string} teamId - The ID of the team.
 * @param {string} userId - The ID of the user to remove.
 * @returns {Promise<boolean>} A promise resolving to true if the request was successful.
 */
export const removeUserFromTeam = async (
  teamId: string,
  userId: string
): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE_URL}/teams/${teamId}/users/${userId}`);
    return true;
  } catch (error) {
    console.error("Error removing user from team:", error);
    return false;
  }
};
