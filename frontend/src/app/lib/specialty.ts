import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { SpecialtyT } from "@/types/specialty";
import { WorkerT } from "../../types/worker";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlSpecialties = API_URL + "/specialties";

//////////////////////////
// Specialties //
//////////////////////////

export async function addSpecialty(specialty: SpecialtyT, teamId: string) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(specialty),
  };
  try {
    const response = await fetch(
      `${apiUrlSpecialties}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add specialty: " + responseData.detail);
    }
    return responseData as SpecialtyT;
  } catch (error) {
    console.error("Failed to add specialty:", error);
    throw new Error("Failed to add specialty, please try again later");
  }
}

export async function getSpecialties(teamId: string) {
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlSpecialties}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch specialties: " + responseData.detail);
    }
    return responseData as SpecialtyT[];
  } catch (error) {
    console.error("Failed to fetch specialties:", error);
    throw new Error("Failed to fetch specialties, please try again later");
  }
}

export async function updateSpecialty(
  updatedSpecialty: SpecialtyT,
  teamId: string
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedSpecialty),
  };
  try {
    const response = await fetch(
      `${apiUrlSpecialties}/${updatedSpecialty.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update specialty: " + responseData.detail);
    }
    return responseData as SpecialtyT;
  } catch (error) {
    console.error("Failed to update specialty:", error);
    throw new Error("Failed to update specialty, please try again later");
  }
}

export async function deleteSpecialty(specialtyId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlSpecialties}/${specialtyId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete specialty: " + responseData.detail);
    }
    return responseData as WorkerT[];
  } catch (error) {
    console.error("Failed to delete specialty:", error);
    throw new Error("Failed to delete specialty, please try again later");
  }
}
