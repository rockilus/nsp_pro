import dayjs from "dayjs";

export type UserT = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  workers: string[];
  language: string;
  signUpDate: dayjs.Dayjs;
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
