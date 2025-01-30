import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getSchedules } from "./schedule";
import { getCoverages } from "./coverage";
import { getConstraints } from "./constraint";
// Types
import { CoverageSelectorT } from "../../types/campaign";
import { ScheduleStatus } from "../../types/schedule";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlCoverageSelectors = API_URL + "/coverage-selectors";

export const toCoverageSelectorT = (data: any): CoverageSelectorT => {
  return {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
  };
};

//////////////////////////
// Coverage Selector //
//////////////////////////

export async function addCoverageSelector(
  coverageSelector: CoverageSelectorT,
  teamId: string
) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(coverageSelector),
  };
  try {
    const response = await fetch(
      `${apiUrlCoverageSelectors}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to add coverage selector: " + responseData.detail
      );
    }
    return toCoverageSelectorT(responseData) as CoverageSelectorT;
  } catch (error) {
    console.error("Failed to add coverage selector:", error);
    throw new Error("Failed to add coverage selector, please try again later");
  }
}

export async function getCoverageSelectors(scheduleId: string, teamId: string) {
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
      `${apiUrlCoverageSelectors}/schedules/${scheduleId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch coverage selectors: " + responseData.detail
      );
    }
    return responseData.map(toCoverageSelectorT) as CoverageSelectorT[];
  } catch (error) {
    console.error("Failed to fetch coverage selectors:", error);
    throw new Error(
      "Failed to fetch coverage selectors, please try again later"
    );
  }
}

export async function updateCoverageSelector(
  coverageSelector: CoverageSelectorT,
  teamId: string
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(coverageSelector),
  };
  try {
    const response = await fetch(
      `${apiUrlCoverageSelectors}/${coverageSelector.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to update coverage selector: " + responseData.detail
      );
    }
    return toCoverageSelectorT(responseData) as CoverageSelectorT;
  } catch (error) {
    console.error("Failed to update coverage selector:", error);
    throw new Error(
      "Failed to update coverage selector, please try again later"
    );
  }
}

export async function deleteCoverageSelector(
  coverageSelectorId: string,
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
      `${apiUrlCoverageSelectors}/${coverageSelectorId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to delete coverage selector: " + responseData.detail
      );
    }
  } catch (error) {
    console.error("Failed to delete coverage selector:", error);
    throw new Error(
      "Failed to delete coverage selector, please try again later"
    );
  }
}

//////////////////////////
// Campaign Tab Data //
//////////////////////////

export async function getCampaignTabData(teamId: string) {
  try {
    const schedules = await getSchedules(teamId);
    const scheduleCampaign =
      schedules.find(
        (schedule) => schedule.status === ScheduleStatus.CAMPAIGN
      ) || null;
    const schedulesValidated = schedules.filter(
      (schedule) => schedule.status === ScheduleStatus.VALIDATED
    );
    const campaignTabData = await Promise.all([
      getCoverages(teamId),
      getConstraints(teamId),
      scheduleCampaign
        ? getCoverageSelectors(scheduleCampaign.id, teamId)
        : Promise.resolve([]),
    ]);
    return {
      scheduleCampaign: scheduleCampaign,
      schedulesValidated: schedulesValidated,
      coverages: campaignTabData[0],
      constraints: campaignTabData[1],
      coverageSelectors: campaignTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch campaign tab data:", error);
    throw new Error(
      "Failed to fetch campaign tab data, please try again later"
    );
  }
}
