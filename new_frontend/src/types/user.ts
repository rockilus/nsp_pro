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
