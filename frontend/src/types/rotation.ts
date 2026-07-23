import dayjs from 'dayjs';

export enum RotationBreakBehavior {
  CONTINUE = 0,
  SWAP = 1,
  RESTART = 2,
}

export type RotationT = {
  id: string;
  teamId: string;
  name: string;
  shiftId: string;
  workerIds: string[];
  currentPosition: number;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs | null;
};

export type RotationCreateDTO = {
  name: string;
  shiftId: string;
  workerIds: string[];
  startDate: number;
  endDate: number | null;
};

export type RotationUpdateDTO = {
  name?: string;
  workerIds?: string[];
  startDate?: number;
  endDate?: number | null;
  currentPosition?: number;
};

export type RotationBreakRequestDTO = {
  behavior: number;
  newWorkerId?: string | null;
};

export const toRotationT = (data: any): RotationT => ({
  ...data,
  startDate: dayjs.unix(data.startDate).utc(),
  endDate: data.endDate ? dayjs.unix(data.endDate).utc() : null,
});

export const fromRotationT = (data: RotationT): any => ({
  ...data,
  startDate: data.startDate.unix(),
  endDate: data.endDate ? data.endDate.unix() : null,
});
