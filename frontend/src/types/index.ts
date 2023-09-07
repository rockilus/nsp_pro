import React from "react";
import { Dayjs } from "dayjs";

//==============================================================================
// Items
//==============================================================================

export interface Doctor {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  hospital: string;
  profile: Record<string, any>;
}

export interface Hospital {
  _id: string;
  name: string;
  profile: Record<string, any>;
  profile_validation: Record<string, any>;
  parameters: Record<string, any>;
}

export interface Schedule {
  _id: string;
  name: string;
  schedule_list: number[];
  start_date: string;
  end_date: string;
  build_date: string;
  author: string;
  hospital: string;
  users: string[];
  shift_labels: string[];
  user_labels: string[];
  override: string[];
  active: boolean;
}

export interface ScheduleData {
  _id: string;
  date: string;
  shift_type: number;
  shift_type_label: string;
  user_last_name: string;
  schedule: string;
  hospital: string;
  user: string;
}

export interface WorkerParam {
  _id: string;
  name: string;
  label: string;
  entry_type: string;
  entry_options: string[];
}

export interface Column {
  name: string;
  label: string;
  entry_type: string;
}

//==============================================================================
// State
//==============================================================================

export interface AuthState {
  currentUser: Record<string, string> | null;
  isAuthenticated: boolean;
  checkedAuth: boolean;
  error?: string;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export interface DoctorsState {
  currentDoctors: Doctor[] | null;
  error?: string;
  createUser: (
    firstName: string,
    lastName: string,
    email: string,
    hospitalId: string
  ) => Promise<void>;
  getHospitalUsers: (hospitalId: string) => Promise<void>;
  saveUserProfile: (
    profile: Record<string, any>,
    userId: string
  ) => Promise<void>;
}

export interface WorkersState {
  currentWorkers: Record<string, any>[] | null;
  error?: string;
  postCreateWorker: () => Promise<void>;
  getWorkers: () => Promise<void>;
  postUpdateWorkerProperty: (
    workerId: string,
    workerParamId: string,
    value: string
  ) => Promise<void>;
  deleteWorker: (workerId: string) => Promise<void>;
}

export interface WorkerParamsState {
  currentWorkerParams: WorkerParam[] | null;
  error?: string;
  postCreateWorkerParam: (
    label: string,
    entry_type: string,
    entry_options: string[]
  ) => Promise<void>;
  getWorkerParams: () => Promise<void>;
  postUpdateWorkerParam: (
    workerParamId: string,
    label: string,
    entry_type: string,
    entry_options: string[]
  ) => Promise<void>;
  deleteWorkerParam: (workerParamId: string) => Promise<void>;
}

export interface HospitalState {
  currentHospital: Hospital | null;
  error?: string;
  createNewHospital: (name: string, userId: string) => Promise<void>;
  addOptionToProfile: (
    option: string,
    dictPath: string[],
    hospitalId: string
  ) => Promise<void>;
  deleteOptionFromProfile: (
    dictPath: string[],
    hospitalId: string
  ) => Promise<void>;
  getHospital: (hospitalId: string) => Promise<void>;
  updateParameter: (
    parameter: string,
    value: string,
    hospitalId: string
  ) => Promise<void>;
}

export interface ScheduleState {
  currentSchedule: Schedule | null;
  currentScheduleList: Schedule[] | null;
  currentScheduleData: ScheduleData[] | null;
  error?: string;
  getScheduleXDays: (
    hospitalId: string,
    startDate: Dayjs,
    numDays: number
  ) => Promise<void>;
  getScheduleList: (
    hospitalId: string,
    startDate: Dayjs,
    endDate: Dayjs
  ) => Promise<void>;
  buildSchedule: (
    hospitalId: string,
    authorId: string,
    startDate: Dayjs,
    endDate: Dayjs
  ) => Promise<void>;
}
