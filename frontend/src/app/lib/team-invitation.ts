import axios from "axios";
import {
  TeamInvitationT,
  toTeamInvitationT,
  fromTeamInvitationT,
  EnrichedTeamInvitationT,
  toEnrichedTeamInvitationT,
} from "../../types/team-invitation";
import { TeamWithMembership, toTeamWithMembership } from "@/types/team";
// Env Vars
import { API_URL } from "./env";

const API_BASE_URL = API_URL + "/team-invitations";

export const createTeamInvitation = async (
  invitation: TeamInvitationT
): Promise<TeamInvitationT> => {
  const response = await axios.post(
    API_BASE_URL,
    fromTeamInvitationT(invitation)
  );
  return toTeamInvitationT(response.data);
};

export const getTeamInvitations = async (
  teamId: string
): Promise<TeamInvitationT[]> => {
  const response = await axios.get(`${API_BASE_URL}/${teamId}`);
  return response.data.map(toTeamInvitationT);
};

export const getUserPendingInvitations = async (): Promise<
  EnrichedTeamInvitationT[]
> => {
  const response = await axios.get(`${API_BASE_URL}/pending`);
  return response.data.map(toEnrichedTeamInvitationT);
};

export const acceptTeamInvitation = async (
  token: string
): Promise<TeamWithMembership> => {
  const response = await axios.post(`${API_BASE_URL}/accept`, {
    token,
  });
  return toTeamWithMembership(response.data);
};

export const rejectTeamInvitation = async (token: string): Promise<boolean> => {
  const response = await axios.post(`${API_BASE_URL}/reject`, {
    token,
  });
  return response.status === 200;
};

export const resendTeamInvitationEmail = async (
  invitationId: string
): Promise<TeamInvitationT> => {
  const response = await axios.post(`${API_BASE_URL}/${invitationId}/resend`);
  return toTeamInvitationT(response.data) as TeamInvitationT;
};

export const deleteTeamInvitation = async (
  invitationId: string
): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_BASE_URL}/${invitationId}`);
  return response.data;
};
