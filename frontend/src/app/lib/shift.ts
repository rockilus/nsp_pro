import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getDimensions } from "./dimension";
// Types
import { DimensionType } from "../../types/dimension";
import { ShiftT } from "../../types/shift";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlShifts = API_URL + "/shifts";

export const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

//////////////////////////
// Shift //
//////////////////////////

export async function addShift(shift: ShiftT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shift),
  };
  try {
    const response = await fetch(
      `${apiUrlShifts}/teams/${shift.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add shift: " + responseData.detail);
    }
    return toShiftT(responseData) as ShiftT;
  } catch (error) {
    console.error("Failed to add shift:", error);
    throw new Error("Failed to add shift, please try again later");
  }
}

export async function getShifts(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlShifts}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch shifts: " + responseData.detail);
    }
    return responseData.map(toShiftT) as ShiftT[];
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    throw new Error("Failed to fetch shifts, please try again later");
  }
}

export async function getWorkShifts(teamId: string) {
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
      `${apiUrlShifts}/work/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch shifts: " + responseData.detail);
    }
    return responseData.map(toShiftT) as ShiftT[];
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    throw new Error("Failed to fetch shifts, please try again later");
  }
}

export async function getAllShifts(teamId: string) {
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
      `${apiUrlShifts}/all/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch shifts: " + responseData.detail);
    }
    return responseData.map(toShiftT) as ShiftT[];
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    throw new Error("Failed to fetch shifts, please try again later");
  }
}

export async function updateShift(updatedShift: ShiftT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedShift),
  };
  try {
    const response = await fetch(
      `${apiUrlShifts}/${updatedShift.id}/teams/${updatedShift.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update shift: " + responseData.detail);
    }
    return toShiftT(responseData) as ShiftT;
  } catch (error) {
    console.error("Failed to update shift:", error);
    throw new Error("Failed to update shift, please try again later");
  }
}

export async function deleteShift(shiftId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlShifts}/${shiftId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete shift: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete shift:", error);
    throw new Error("Failed to delete shift, please try again later");
  }
}

//////////////////////////
// Shifts Tab Data //
//////////////////////////

export async function getShiftsTabData(teamId: string) {
  try {
    const shiftsTabData = await Promise.all([
      getShifts(teamId),
      getDimensions(teamId),
    ]);
    return {
      shifts: shiftsTabData[0],
      dimensions: shiftsTabData[1].dimensions,
      dimEntries: shiftsTabData[1].dimEntries,
    };
  } catch (error) {
    console.error("Failed to fetch shifts tab data:", error);
    throw new Error("Failed to fetch shifts tab data, please try again later");
  }
}
