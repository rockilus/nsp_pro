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
  invitation: TeamInvitationT,
  teamId: string
): Promise<TeamInvitationT> => {
  const response = await fetch(API_BASE_URL + `/teams/${teamId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(fromTeamInvitationT(invitation)),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error("Failed to create team invitation: " + errorData.detail);
  }

  const data = await response.json();
  return toTeamInvitationT(data);
};

export const getTeamInvitations = async (
  teamId: string
): Promise<TeamInvitationT[]> => {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error("Failed to get team invitations: " + errorData.detail);
  }

  const data = await response.json();
  return data.map(toTeamInvitationT);
};

export const getUserPendingInvitations = async (): Promise<
  EnrichedTeamInvitationT[]
> => {
  const response = await fetch(`${API_BASE_URL}/pending`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error("Failed to get pending invitations: " + errorData.detail);
  }

  const data = await response.json();
  return data.map(toEnrichedTeamInvitationT);
};

export const acceptTeamInvitation = async (
  token: string
): Promise<TeamWithMembership> => {
  const response = await fetch(`${API_BASE_URL}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error("Failed to accept team invitation: " + errorData.detail);
  }

  const data = await response.json();
  return toTeamWithMembership(data);
};

export const rejectTeamInvitation = async (token: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ token }),
  });

  return response.ok;
};

export const resendTeamInvitationEmail = async (
  invitationId: string,
  teamId: string
): Promise<TeamInvitationT> => {
  const response = await fetch(
    `${API_BASE_URL}/${invitationId}/resend/teams/${teamId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error("Failed to resend team invitation: " + errorData.detail);
  }

  const data = await response.json();
  return toTeamInvitationT(data) as TeamInvitationT;
};

export const deleteTeamInvitation = async (
  invitationId: string,
  teamId: string
): Promise<{ message: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/${invitationId}/teams/${teamId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error("Failed to delete team invitation: " + errorData.detail);
  }

  return response.json();
};
