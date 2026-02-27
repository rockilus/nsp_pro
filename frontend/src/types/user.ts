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
