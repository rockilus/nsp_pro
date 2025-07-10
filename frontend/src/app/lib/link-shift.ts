// Types
import { LinkShiftT } from "../../types/shift";
// Env Vars
import { API_URL } from "./env";

const apiUrlLinkShifts = API_URL + "/link-shifts";

//////////////////////////
// LinkShift //
//////////////////////////

export async function addLinkShift(linkShift: LinkShiftT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(linkShift),
  };
  try {
    const response = await fetch(
      `${apiUrlLinkShifts}/teams/${linkShift.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add link shift: " + responseData.detail);
    }
    return responseData as LinkShiftT;
  } catch (error) {
    console.error("Failed to add link shift:", error);
    throw new Error("Failed to add link shift, please try again later");
  }
}

export async function getLinkShifts(teamId: string) {
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlLinkShifts}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch link shifts: " + responseData.detail);
    }
    return responseData as LinkShiftT[];
  } catch (error) {
    console.error("Failed to fetch link shifts:", error);
    throw new Error("Failed to fetch link shifts, please try again later");
  }
}

export async function updateLinkShift(updatedLinkShift: LinkShiftT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedLinkShift),
  };
  try {
    const response = await fetch(
      `${apiUrlLinkShifts}/${updatedLinkShift.id}/teams/${updatedLinkShift.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update link shift: " + responseData.detail);
    }
    return responseData as LinkShiftT;
  } catch (error) {
    console.error("Failed to update link shift:", error);
    throw new Error("Failed to update link shift, please try again later");
  }
}

export async function deleteLinkShift(linkShiftId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlLinkShifts}/${linkShiftId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete link shift: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete link shift:", error);
    throw new Error("Failed to delete link shift, please try again later");
  }
}
