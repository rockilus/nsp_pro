import dayjs from "dayjs";
// Types
import { MembershipForTeamWithMembershipDTO } from "@/types/team";

export type UserT = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  workers: string[];
  language: string;
  signUpAt: dayjs.Dayjs;
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
  membership: MembershipForTeamWithMembershipDTO;
};

export const toUserT = (data: any): UserT => {
  return {
    ...data,
    signUpAt: dayjs.utc(data.signUpAt),
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
