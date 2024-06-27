import { unstable_noStore as noStore } from "next/cache";
// Actions
import { getWorkers } from "./worker";
import { getShifts } from "./shift";
// Types
import {
  StatsT,
  StatsHeaderT,
  StatsOptionsT,
  StatsShiftOptionsT,
} from "../../types/stats";

const apiUrlStats = process.env.NEXT_PUBLIC_API_URL + "/stats";

//////////////////////////
// Stats //
//////////////////////////

export async function getStats(statsOptions: StatsOptionsT, teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(statsOptions),
  };
  try {
    const response = await fetch(`${apiUrlStats}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch stats: " + responseData.detail);
    }
    return responseData as StatsT;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    throw new Error("Failed to fetch stats, please try again later");
  }
}

//////////////////////////
// Header //
//////////////////////////

export async function addHeader(header: StatsHeaderT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(header),
  };
  try {
    const response = await fetch(
      `${apiUrlStats}/stats-headers/teams/${header.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add header: " + responseData.detail);
    }
    return responseData as StatsHeaderT;
  } catch (error) {
    console.error("Failed to add header:", error);
    throw new Error("Failed to add header, please try again later");
  }
}

export async function deleteHeader(headerId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlStats}/stats-headers/${headerId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete header: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete header:", error);
    throw new Error("Failed to delete header, please try again later");
  }
}

//////////////////////////
// Shift Options //
//////////////////////////

export async function getShiftOptions(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlStats}/shift-options/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch shift options: " + responseData.detail);
    }
    return responseData as StatsShiftOptionsT;
  } catch (error) {
    console.error("Failed to fetch shift options:", error);
    throw new Error("Failed to fetch shift options, please try again later");
  }
}

//////////////////////////
// Stats Tab Data //
//////////////////////////

export async function getStatsTabData(teamId: string) {
  try {
    const statsTabData = await Promise.all([
      getShifts(teamId),
      getWorkers(teamId),
      getShiftOptions(teamId),
    ]);
    return {
      shifts: statsTabData[0],
      workers: statsTabData[1],
      shiftOptions: statsTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch stats tab data:", error);
    throw new Error("Failed to fetch stats tab data, please try again later");
  }
}
