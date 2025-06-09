import { unstable_noStore as noStore } from "next/cache";
// Actions
import { getAllShifts } from "./shift";
import { getAllWorkers } from "./worker";
import { getDailyShiftDemands } from "./daily-shift-demand";
import { getShiftOptions } from "./stats";
// Types
import { RequestT, toRequestT, fromRequestT } from "../../types/request";
// Env Vars
import { API_URL } from "./env";

const apiUrlRequests = API_URL + "/requests";

//////////////////////////
// Request //
//////////////////////////

export async function addRequest(request: RequestT, teamId: string) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromRequestT(request)),
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
    body: JSON.stringify(fromRequestT(updatedRequest)),
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

// Accept a request
export async function acceptRequest(
  requestId: string,
  teamId: string
): Promise<RequestT> {
  // Input validation
  if (!requestId?.trim()) {
    throw new Error("Request ID is required");
  }
  if (!teamId?.trim()) {
    throw new Error("Team ID is required");
  }

  try {
    const response = await fetch(
      `${apiUrlRequests}/${requestId}/teams/${teamId}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP ${response.status}`;
      throw new Error(`Failed to accept request: ${errorMessage}`);
    }

    const responseData = await response.json();
    return toRequestT(responseData);
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to accept request:")
    ) {
      throw error;
    }

    // Handle network and other errors
    console.error("Failed to accept request:", error);
    throw new Error(
      "Failed to accept request. Please check your connection and try again."
    );
  }
}

// Deny a request
export async function denyRequest(
  requestId: string,
  teamId: string
): Promise<RequestT> {
  // Input validation
  if (!requestId?.trim()) {
    throw new Error("Request ID is required");
  }
  if (!teamId?.trim()) {
    throw new Error("Team ID is required");
  }

  try {
    const response = await fetch(
      `${apiUrlRequests}/${requestId}/teams/${teamId}/deny`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP ${response.status}`;
      throw new Error(`Failed to deny request: ${errorMessage}`);
    }

    const responseData = await response.json();
    return toRequestT(responseData);
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to deny request:")
    ) {
      throw error;
    }

    // Handle network and other errors
    console.error("Failed to deny request:", error);
    throw new Error(
      "Failed to deny request. Please check your connection and try again."
    );
  }
}

// Rescind a request (revert approved/denied back to pending)
export async function rescindRequest(
  requestId: string,
  teamId: string
): Promise<RequestT> {
  // Input validation
  if (!requestId?.trim()) {
    throw new Error("Request ID is required");
  }
  if (!teamId?.trim()) {
    throw new Error("Team ID is required");
  }

  try {
    const response = await fetch(
      `${apiUrlRequests}/${requestId}/teams/${teamId}/rescind`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP ${response.status}`;
      throw new Error(`Failed to rescind request: ${errorMessage}`);
    }

    const responseData = await response.json();
    return toRequestT(responseData);
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof Error &&
      error.message.startsWith("Failed to rescind request:")
    ) {
      throw error;
    }

    // Handle network and other errors
    console.error("Failed to rescind request:", error);
    throw new Error(
      "Failed to rescind request. Please check your connection and try again."
    );
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
      getAllWorkers(teamId),
      getAllShifts(teamId),
      getRequests(teamId),
      getDailyShiftDemands(teamId),
      getShiftOptions(teamId),
    ]);
    return {
      workers: requestsTabData[0],
      shifts: requestsTabData[1],
      requests: requestsTabData[2],
      demands: requestsTabData[3],
      shiftOptions: requestsTabData[4],
    };
  } catch (error) {
    console.error("Failed to fetch requests tab data:", error);
    throw new Error(
      "Failed to fetch requests tab data, please try again later"
    );
  }
}
