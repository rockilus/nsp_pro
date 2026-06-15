import dayjs from 'dayjs';

export type SlotPeriodT = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type SlotPeriodsT = {
  morning: SlotPeriodT;
  afternoon: SlotPeriodT;
  night: SlotPeriodT;
};

export type TeamT = {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: dayjs.Dayjs;
  useSolver: boolean;
  slotPeriods?: SlotPeriodsT | null;
};

export enum TeamMembershipRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

export type MembershipForTeamWithMembership = {
  role: TeamMembershipRole;
};

export type TeamWithMembership = {
  team: TeamT;
  membership: MembershipForTeamWithMembership;
};

export const toTeamtT = (data: any): TeamT => {
  return {
    ...data,
    createdAt: dayjs.unix(data.createdAt).utc(),
  };
};

export const fromTeamT = (data: TeamT): any => {
  return {
    ...data,
    createdAt: data.createdAt.unix(),
  };
};

export const toTeamWithMembership = (data: any): TeamWithMembership => {
  return {
    ...data,
    team: toTeamtT(data.team),
  };
};
export const fromTeamWithMembership = (data: TeamWithMembership): any => {
  return {
    ...data,
    team: fromTeamT(data.team),
  };
};
