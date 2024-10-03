// Types
import { ShiftDemandT } from "../../types/coverage";
// Env Vars
import { API_URL } from "./env";

const apiUrlShiftDemands = API_URL + "/shift-demands";

//////////////////////////
// Shift Demand //
//////////////////////////

export async function addShiftDemands(
  shiftDemands: ShiftDemandT[],
  teamId: string
) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shiftDemands),
  };
  try {
    const response = await fetch(
      `${apiUrlShiftDemands}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add shift demand: " + responseData.detail);
    }
    return responseData as ShiftDemandT[];
  } catch (error) {
    console.error("Failed to add shift demand:", error);
    throw new Error("Failed to add shift demand, please try again later");
  }
}

export async function getShiftDemands(teamId: string) {
  try {
    const response = await fetch(`${apiUrlShiftDemands}/teams/${teamId}`);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to get shift demands: " + responseData.detail);
    }
    return responseData as ShiftDemandT[];
  } catch (error) {
    console.error("Failed to get shift demands:", error);
    throw new Error("Failed to get shift demands, please try again later");
  }
}

export async function updateShiftDemand(
  updatedShiftDemand: ShiftDemandT,
  teamId: string
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedShiftDemand),
  };
  try {
    const response = await fetch(
      `${apiUrlShiftDemands}/${updatedShiftDemand.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update shift demand: " + responseData.detail);
    }
    return responseData as ShiftDemandT;
  } catch (error) {
    console.error("Failed to update shift demand:", error);
    throw new Error("Failed to update shift demand, please try again later");
  }
}

export async function deleteShiftDemands(
  shiftDemandIds: string[],
  teamId: string
) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shiftDemandIds),
  };
  try {
    const response = await fetch(
      `${apiUrlShiftDemands}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete shift demand: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete shift demand:", error);
    throw new Error("Failed to delete shift demand, please try again later");
  }
}
