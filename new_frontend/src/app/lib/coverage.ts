import { unstable_noStore as noStore } from "next/cache";
// Actions
import { toShiftT, getShifts } from "./shift";
// Types
import { CoverageT, ShiftDemandT } from "../../types/coverage";
// Env Vars
import { API_URL } from "./env";

const apiUrlCoverages = API_URL + "/coverages";

export const toShiftDemandT = (shiftDemand: any): ShiftDemandT => ({
  ...shiftDemand,
  shift: toShiftT(shiftDemand.shift),
});

export const toCoverageT = (coverage: any): CoverageT => ({
  ...coverage,
  shiftDemands: coverage.shiftDemands.map(toShiftDemandT),
});

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
    return toCoverageT(responseData);
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
    return responseData.map(toCoverageT) as CoverageT[];
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
    return toCoverageT(responseData);
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
// Shift Demand //
//////////////////////////

export async function addShiftDemand(
  shiftDemand: ShiftDemandT,
  teamId: string
) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shiftDemand),
  };
  try {
    const response = await fetch(
      `${apiUrlCoverages}/${shiftDemand.coverageId}/shift_demands/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add shift demand: " + responseData.detail);
    }
    return toShiftDemandT(responseData);
  } catch (error) {
    console.error("Failed to add shift demand:", error);
    throw new Error("Failed to add shift demand, please try again later");
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
      `${apiUrlCoverages}/${updatedShiftDemand.coverageId}/shift_demands/${updatedShiftDemand.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update shift demand: " + responseData.detail);
    }
    return toShiftDemandT(responseData);
  } catch (error) {
    console.error("Failed to update shift demand:", error);
    throw new Error("Failed to update shift demand, please try again later");
  }
}

export async function deleteShiftDemand(
  coverageId: string,
  shiftDemandId: string,
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
      `${apiUrlCoverages}/${coverageId}/shift_demands/${shiftDemandId}/teams/${teamId}`,
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

//////////////////////////
// Coverages Tab Data //
//////////////////////////

export async function getCoveragesTabData(teamId: string) {
  try {
    const coveragesTabData = await Promise.all([
      getShifts(teamId),
      getCoverages(teamId),
    ]);
    return { shifts: coveragesTabData[0], coverages: coveragesTabData[1] };
  } catch (error) {
    console.error("Failed to fetch coverages tab data:", error);
    throw new Error(
      "Failed to fetch coverages tab data, please try again later"
    );
  }
}
