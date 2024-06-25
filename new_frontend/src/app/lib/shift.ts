import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
// Types
import { ShiftT, ShiftDimensionT, ShiftPropertyT } from "../../types/shift";

const apiUrlShifts = process.env.NEXT_PUBLIC_API_URL + "/shifts";
const apiUrlShiftDimensions =
  process.env.NEXT_PUBLIC_API_URL + "/shift-dimensions";

const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

//////////////////////////
// Shift //
//////////////////////////

export async function getshifts(teamId: string) {
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

//////////////////////////
// Shift Dimensions //
//////////////////////////

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
      `${apiUrlShiftDimensions}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch shift dimensions: " + responseData.detail
      );
    }
    return responseData as ShiftDimensionT[];
  } catch (error) {
    console.error("Failed to fetch shift dimensions:", error);
    throw new Error("Failed to fetch shift dimensions, please try again later");
  }
}

export async function addShiftDimension(shiftDimension: ShiftDimensionT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shiftDimension),
  };
  try {
    const response = await fetch(
      `${apiUrlShiftDimensions}/teams/${shiftDimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add shift dimension: " + responseData.detail);
    }
    return responseData as {
      newDimension: ShiftDimensionT;
      newProperties: ShiftPropertyT[];
    };
  } catch (error) {
    console.error("Failed to add shift dimension:", error);
    throw new Error("Failed to add shift dimension, please try again later");
  }
}

export async function updateShiftDimension(
  updatedShiftDimension: ShiftDimensionT
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedShiftDimension),
  };
  try {
    const response = await fetch(
      `${apiUrlShiftDimensions}/${updatedShiftDimension.id}/teams/${updatedShiftDimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to update shift dimension: " + responseData.detail
      );
    }
    return responseData as ShiftDimensionT;
  } catch (error) {
    console.error("Failed to update shift dimension:", error);
    throw new Error("Failed to update shift dimension, please try again later");
  }
}

export async function deleteShiftDimension(
  shiftDimensionId: string,
  teamId: string
) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlShiftDimensions}/${shiftDimensionId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to delete shift dimension: " + responseData.detail
      );
    }
  } catch (error) {
    console.error("Failed to delete shift dimension:", error);
    throw new Error("Failed to delete shift dimension, please try again later");
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
    method: "PATCH",
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
      getshifts(teamId),
      getShiftDimensions(teamId),
    ]);
    return { shifts: shiftsTabData[0], shiftDimensions: shiftsTabData[1] };
  } catch (error) {
    console.error("Failed to fetch shifts tab data:", error);
    throw new Error("Failed to fetch shifts tab data, please try again later");
  }
}
