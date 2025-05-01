import axios from "axios";
import {
  TeamInvitationT,
  toTeamInvitationT,
  fromTeamInvitationT,
} from "../../types/team-invitation";

const API_BASE_URL = "/api/team-invitations";

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

export const getPendingInvitationsByEmail = async (
  email: string
): Promise<TeamInvitationT[]> => {
  const response = await axios.get(`${API_BASE_URL}/pending`, {
    params: { email },
  });
  return response.data.map(toTeamInvitationT);
};

export const acceptTeamInvitation = async (
  userId: string,
  token: string
): Promise<{ message: string }> => {
  const response = await axios.post(`${API_BASE_URL}/accept`, {
    userId,
    token,
  });
  return response.data;
};

export const rejectTeamInvitation = async (
  userId: string,
  token: string
): Promise<{ message: string }> => {
  const response = await axios.post(`${API_BASE_URL}/reject`, {
    userId,
    token,
  });
  return response.data;
};

export const resendTeamInvitationEmail = async (
  invitationId: string
): Promise<{ message: string }> => {
  const response = await axios.post(`${API_BASE_URL}/${invitationId}/resend`);
  return response.data;
};

export const deleteTeamInvitation = async (
  invitationId: string
): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_BASE_URL}/${invitationId}`);
  return response.data;
};
