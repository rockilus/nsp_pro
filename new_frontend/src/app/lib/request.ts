import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
// Actions
import { getShifts } from "./shift";
import { getWorkers } from "./worker";
// Types
import { ShiftT } from "../../types/shift";
import { RequestT } from "../../types/request";

const apiUrlRequests = process.env.NEXT_PUBLIC_API_URL + "/requests";

export const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.utc(data.startTime),
    endTime: dayjs.utc(data.endTime),
  };
};

export const toRequestT = (data: any) => {
  const r: RequestT = {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
  };
  return r;
};

//////////////////////////
// Request //
//////////////////////////

export async function addRequest(request: RequestT, teamId: string) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  };
  try {
    const response = await fetch(`${apiUrlRequests}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add request: " + responseData.detail);
    }
    return toRequestT(responseData) as RequestT;
  } catch (error) {
    console.error("Failed to add request:", error);
    throw new Error("Failed to add request, please try again later");
  }
}

export async function getRequests(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlRequests}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch requests: " + responseData.detail);
    }
    return responseData.map(toRequestT) as RequestT[];
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    throw new Error("Failed to fetch requests, please try again later");
  }
}

export async function updateRequest(updatedRequest: RequestT, teamId: string) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedRequest),
  };
  try {
    const response = await fetch(
      `${apiUrlRequests}/${updatedRequest.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update request: " + responseData.detail);
    }
    return toRequestT(responseData) as RequestT;
  } catch (error) {
    console.error("Failed to update request:", error);
    throw new Error("Failed to update request, please try again later");
  }
}

export async function deleteRequest(requestId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlRequests}/${requestId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to request shift: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to request shift:", error);
    throw new Error("Failed to request shift, please try again later");
  }
}

//////////////////////////
// Requests Tab Data //
//////////////////////////

export async function getRequestsTabData(teamId: string) {
  try {
    const requestsTabData = await Promise.all([
      getWorkers(teamId),
      getShifts(teamId),
      getRequests(teamId),
    ]);
    return {
      workers: requestsTabData[0],
      shifts: requestsTabData[1],
      requests: requestsTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch requests tab data:", error);
    throw new Error(
      "Failed to fetch requests tab data, please try again later"
    );
  }
}
