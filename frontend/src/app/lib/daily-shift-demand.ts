import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlDailyShiftDemand = API_URL + "/daily-shift-demands";

export const toDailyShiftDemandT = (data: any): DailyShiftDemandT => {
  return {
    ...data,
    date: dayjs.unix(data.date).utc(),
  };
};

export const fromDailyShiftDemandT = (data: DailyShiftDemandT): any => {
  return {
    ...data,
    date: data.date.unix(),
  };
};

//////////////////////////
// DailyShiftDemand //
//////////////////////////

export async function addDailyShiftDemand(dailyShiftDemand: DailyShiftDemandT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromDailyShiftDemandT(dailyShiftDemand)),
  };
  try {
    const response = await fetch(
      `${apiUrlDailyShiftDemand}/teams/${dailyShiftDemand.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add dailyShiftDemand: " + responseData.detail);
    }
    return toDailyShiftDemandT(responseData) as DailyShiftDemandT;
  } catch (error) {
    console.error("Failed to add dailyShiftDemand:", error);
    throw new Error("Failed to add dailyShiftDemand, please try again later");
  }
}

export async function getDailyShiftDemands(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  const url = `${apiUrlDailyShiftDemand}/teams/${teamId}`;
  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch daily shift demands: " + responseData.detail
      );
    }
    return responseData.map(toDailyShiftDemandT) as DailyShiftDemandT[];
  } catch (error) {
    console.error("Failed to fetch daily shift demands:", error);
    throw new Error(
      "Failed to fetch daily shift demands, please try again later"
    );
  }
}

export async function updateDailyShiftDemand(
  dailyShiftDemand: DailyShiftDemandT
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromDailyShiftDemandT(dailyShiftDemand)),
  };
  try {
    const response = await fetch(
      `${apiUrlDailyShiftDemand}/${dailyShiftDemand.id}/teams/${dailyShiftDemand.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to update daily shift demand: " + responseData.detail
      );
    }
    return toDailyShiftDemandT(responseData) as DailyShiftDemandT;
  } catch (error) {
    console.error("Failed to update daily shift demand:", error);
    throw new Error(
      "Failed to update daily shift demand, please try again later"
    );
  }
}

export async function deleteDailyShiftDemand(dsdId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlDailyShiftDemand}/${dsdId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to delete daily shift demand: " + responseData.detail
      );
    }
  } catch (error) {
    console.error("Failed to delete daily shift demand:", error);
    throw new Error(
      "Failed to delete daily shift demand, please try again later"
    );
  }
}
