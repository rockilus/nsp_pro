import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import {
  ShiftT,
  DimensionT,
  ShiftPropertyT,
  DimEntryT,
} from "../../types/shift";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlShifts = API_URL + "/shifts";
const apiUrlDimensions = API_URL + "/dimensions";
const apiUrlDimEntries = API_URL + "/dim-entries";

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
// Dimensions //
//////////////////////////

export async function addDimension(dimension: DimensionT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dimension),
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/teams/${dimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add dimension: " + responseData.detail);
    }
    return responseData as {
      newDimension: DimensionT;
      newProperties: ShiftPropertyT[];
    };
  } catch (error) {
    console.error("Failed to add dimension:", error);
    throw new Error("Failed to add dimension, please try again later");
  }
}

export async function getShiftDimensions(teamId: string) {
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
      `${apiUrlDimensions}/shift/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch shift dimensions: " + responseData.detail
      );
    }
    return responseData as DimensionT[];
  } catch (error) {
    console.error("Failed to fetch shift dimensions:", error);
    throw new Error("Failed to fetch shift dimensions, please try again later");
  }
}

export async function updateDimension(updatedDimension: DimensionT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedDimension),
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/${updatedDimension.id}/teams/${updatedDimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update dimension: " + responseData.detail);
    }
    return responseData as DimensionT;
  } catch (error) {
    console.error("Failed to update dimension:", error);
    throw new Error("Failed to update dimension, please try again later");
  }
}

export async function deleteDimension(dimensionId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlDimensions}/${dimensionId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete dimension: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete dimension:", error);
    throw new Error("Failed to delete dimension, please try again later");
  }
}

//////////////////////////
// Shift Properties //
//////////////////////////

export async function updateShiftProperty(
  shiftProperty: ShiftPropertyT,
  teamId: string
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shiftProperty),
  };
  try {
    const response = await fetch(
      `${apiUrlShifts}/${shiftProperty.shiftId}/properties/${shiftProperty.shiftDimensionId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to update shift property: " + responseData.detail
      );
    }
    return responseData as ShiftPropertyT;
  } catch (error) {
    console.error("Failed to update shift property:", error);
    throw new Error("Failed to update shift property, please try again later");
  }
}

//////////////////////////
// Shifts Tab Data //
//////////////////////////

export async function getShiftsTabData(teamId: string) {
  try {
    const shiftsTabData = await Promise.all([
      getShifts(teamId),
      getShiftDimensions(teamId),
    ]);
    return { shifts: shiftsTabData[0], shiftDimensions: shiftsTabData[1] };
  } catch (error) {
    console.error("Failed to fetch shifts tab data:", error);
    throw new Error("Failed to fetch shifts tab data, please try again later");
  }
}
