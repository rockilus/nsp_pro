import { unstable_noStore as noStore } from "next/cache";
// Actions
import { getWorkShifts } from "./shift";
import { getShiftDemands } from "./shift-demand";
// Types
import { CoverageT } from "../../types/coverage";
// Env Vars
import { API_URL } from "./env";

const apiUrlCoverages = API_URL + "/coverages";

//////////////////////////
// Coverage //
//////////////////////////

export async function addCoverage(coverage: CoverageT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(coverage),
  };
  try {
    const response = await fetch(
      `${apiUrlCoverages}/teams/${coverage.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add coverage: " + responseData.detail);
    }
    return responseData as CoverageT;
  } catch (error) {
    console.error("Failed to add coverage:", error);
    throw new Error("Failed to add coverage, please try again later");
  }
}

export async function getCoverages(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlCoverages}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch coverages: " + responseData.detail);
    }
    return responseData as CoverageT[];
  } catch (error) {
    console.error("Failed to fetch coverages:", error);
    throw new Error("Failed to fetch coverages, please try again later");
  }
}

export async function updateCoverage(updatedCoverage: CoverageT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedCoverage),
  };
  try {
    const response = await fetch(
      `${apiUrlCoverages}/${updatedCoverage.id}/teams/${updatedCoverage.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update coverage: " + responseData.detail);
    }
    return responseData as CoverageT;
  } catch (error) {
    console.error("Failed to update coverage:", error);
    throw new Error("Failed to update coverage, please try again later");
  }
}

export async function deleteCoverage(coverageId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlCoverages}/${coverageId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete coverage: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete coverage:", error);
    throw new Error("Failed to delete coverage, please try again later");
  }
}

//////////////////////////
// Coverages Tab Data //
//////////////////////////

export async function getCoveragesTabData(teamId: string) {
  try {
    const coveragesTabData = await Promise.all([
      getWorkShifts(teamId),
      getCoverages(teamId),
      getShiftDemands(teamId),
    ]);
    return {
      shifts: coveragesTabData[0],
      coverages: coveragesTabData[1],
      shiftDemands: coveragesTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch coverages tab data:", error);
    throw new Error(
      "Failed to fetch coverages tab data, please try again later"
    );
  }
}
