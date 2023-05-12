import React from "react";

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
}
