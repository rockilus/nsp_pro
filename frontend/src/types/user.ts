import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import {
  MembershipForTeamWithMembership,
  TeamMembershipRole,
} from "@/types/team";

dayjs.extend(utc);

export type UserT = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
  signUpAt: dayjs.Dayjs;
  impersonatingUserId: string | null;
};

export type UserAuthT = {
  id: string;
  email: string;
};

export type UserDashboardT = {
  user: UserT | null;
  userAuthn: UserAuthT | null;
  userAuthz: UserAuthT | null;
};

export type UserWithMembership = {
  user: UserT;
  membership: MembershipForTeamWithMembership;
};

export const toUserT = (data: any): UserT => {
  return {
    ...data,
    signUpAt: dayjs.unix(data.signUpAt).utc(),
  };
};

export const fromUserT = (data: UserT): any => {
  return {
    ...data,
    signUpAt: data.signUpAt.unix(),
  };
};

export const toUserWithMembership = (data: any): UserWithMembership => {
  return {
    ...data,
    user: toUserT(data.user),
  };
};

export const fromUserWithMembership = (data: UserWithMembership): any => {
  return {
    ...data,
    user: fromUserT(data.user),
  };
};

export const toUserDashboardT = (data: any): UserDashboardT => {
  return {
    ...data,
    user: data.user ? toUserT(data.user) : null,
  };
};

export const PageRolePermissions = {
  welcome: [TeamMembershipRole.OWNER, TeamMembershipRole.MEMBER],
  workers: [TeamMembershipRole.OWNER],
  shifts: [TeamMembershipRole.OWNER],
  coverages: [TeamMembershipRole.OWNER],
  constraints: [TeamMembershipRole.OWNER],
  requests: [TeamMembershipRole.OWNER, TeamMembershipRole.MEMBER],
  campaign: [TeamMembershipRole.OWNER],
  schedule: [TeamMembershipRole.OWNER, TeamMembershipRole.MEMBER],
  "shift-demands": [TeamMembershipRole.OWNER],
  stats: [TeamMembershipRole.OWNER],
  teams: [TeamMembershipRole.OWNER],
};
