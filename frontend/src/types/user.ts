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
  systemRole: string | null;
};

export type UserWithMembership = {
  user: UserT;
  membership: MembershipForTeamWithMembership;
};

export const toUserT = (data: any): UserT => {
  return {
    ...data,
    signUpAt: dayjs.unix(data.signUpAt).utc(),
    systemRole: data.systemRole ?? null,
  };
};

export const fromUserT = (data: UserT): any => {
  // Omit systemRole — the self-update endpoint only accepts
  // firstName, lastName, email, and language.
  const { systemRole, impersonatingUserId, signUpAt, id, ...updateFields } =
    data;
  return {
    ...updateFields,
    signUpAt: signUpAt.unix(),
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
