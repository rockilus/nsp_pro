import dayjs from "dayjs";

export type TeamT = {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: dayjs.Dayjs;
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
