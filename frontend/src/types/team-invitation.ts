import dayjs from 'dayjs';

export enum TeamInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}
export enum TeamInvitationType {
  MEMBER = 'member',
}
export type TeamInvitationT = {
  id: string;
  teamId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  type: TeamInvitationType;
  workerId: string | null;
  token: string;
  status: TeamInvitationStatus;
  createdBy: string | null;
  createdAt: dayjs.Dayjs;
  expiresAt: dayjs.Dayjs;
  lastSentAt: dayjs.Dayjs | null;
};

export type EnrichedTeamInvitationT = {
  id: string;
  teamId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  type: TeamInvitationType;
  workerId: string | null;
  token: string;
  status: TeamInvitationStatus;
  createdBy: string | null;
  createdAt: dayjs.Dayjs;
  expiresAt: dayjs.Dayjs;
  lastSentAt: dayjs.Dayjs | null;
  teamName: string;
  creatorName: string | null;
};

export const toTeamInvitationT = (data: any): TeamInvitationT => {
  return {
    ...data,
    createdAt: dayjs.unix(data.createdAt).utc(),
    expiresAt: dayjs.unix(data.expiresAt).utc(),
    lastSentAt: data.lastSentAt ? dayjs.unix(data.lastSentAt).utc() : null,
  };
};

export const fromTeamInvitationT = (data: TeamInvitationT): any => {
  return {
    ...data,
    createdAt: data.createdAt.unix(),
    expiresAt: data.expiresAt.unix(),
    lastSentAt: data.lastSentAt ? data.lastSentAt.unix() : null,
  };
};

export const toEnrichedTeamInvitationT = (data: any): EnrichedTeamInvitationT => {
  return {
    ...data,
    createdAt: dayjs.unix(data.createdAt).utc(),
    expiresAt: dayjs.unix(data.expiresAt).utc(),
    lastSentAt: data.lastSentAt ? dayjs.unix(data.lastSentAt).utc() : null,
  };
};

export const fromEnrichedTeamInvitationT = (data: EnrichedTeamInvitationT): any => {
  return {
    ...data,
    createdAt: data.createdAt.unix(),
    expiresAt: data.expiresAt.unix(),
    lastSentAt: data.lastSentAt ? data.lastSentAt.unix() : null,
  };
};
