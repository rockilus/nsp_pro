/**
 * Legacy request API functions
 *
 * @deprecated These functions are deprecated and will be removed in a future version.
 * Please use the new RequestApi class and useRequest hooks instead.
 *
 * Migration guide:
 * - Replace direct function calls with appropriate hooks from useRequest.ts
 * - Use RequestApi class for non-React contexts
 * - Use useGetRequestsTabData() hook instead of getRequestsTabData()
 */

// Actions
import { getAllShifts } from "./shift";
import { getAllWorkers } from "./worker";
import { getShiftOptions } from "./stats";
// Types
import { RequestT, toRequestT, fromRequestT } from "../../types/request";
// New API Client
import { RequestApi } from "./api/requestApi";
// Env Vars
import { API_URL } from "./env";

const apiUrlRequests = API_URL + "/requests";

//////////////////////////
// Legacy Request Functions //
//////////////////////////

/**
 * @deprecated Use RequestApi.addRequest() or useAddRequest() hook instead
 */
export async function addRequest(request: RequestT, teamId: string) {
  console.warn(
    "⚠️ Using deprecated addRequest function. Please use RequestApi.addRequest() or useAddRequest() hook instead."
  );
  return RequestApi.addRequestLegacy(request, teamId);
}

/**
 * @deprecated Use RequestApi.getRequests() or useGetRequests() hook instead
 */
export async function getRequests(teamId: string) {
  console.warn(
    "⚠️ Using deprecated getRequests function. Please use RequestApi.getRequests() or useGetRequests() hook instead."
  );
  return RequestApi.getRequestsLegacy(teamId);
}

/**
 * @deprecated Use RequestApi.updateRequest() or useUpdateRequest() hook instead
 */
export async function updateRequest(updatedRequest: RequestT, teamId: string) {
  console.warn(
    "⚠️ Using deprecated updateRequest function. Please use RequestApi.updateRequest() or useUpdateRequest() hook instead."
  );
  return RequestApi.updateRequestLegacy(updatedRequest, teamId);
}

/**
 * @deprecated Use RequestApi.acceptRequest() or useAcceptRequest() hook instead
 */
export async function acceptRequest(
  requestId: string,
  teamId: string
): Promise<RequestT> {
  console.warn(
    "⚠️ Using deprecated acceptRequest function. Please use RequestApi.acceptRequest() or useAcceptRequest() hook instead."
  );
  return RequestApi.acceptRequestLegacy(requestId, teamId);
}

/**
 * @deprecated Use RequestApi.denyRequest() or useDenyRequest() hook instead
 */
export async function denyRequest(
  requestId: string,
  teamId: string
): Promise<RequestT> {
  console.warn(
    "⚠️ Using deprecated denyRequest function. Please use RequestApi.denyRequest() or useDenyRequest() hook instead."
  );
  return RequestApi.denyRequestLegacy(requestId, teamId);
}

/**
 * @deprecated Use RequestApi.rescindRequest() or useRescindRequest() hook instead
 */
export async function rescindRequest(
  requestId: string,
  teamId: string
): Promise<RequestT> {
  console.warn(
    "⚠️ Using deprecated rescindRequest function. Please use RequestApi.rescindRequest() or useRescindRequest() hook instead."
  );
  return RequestApi.rescindRequestLegacy(requestId, teamId);
}

/**
 * @deprecated Use RequestApi.deleteRequest() or useDeleteRequest() hook instead
 */
export async function deleteRequest(requestId: string, teamId: string) {
  console.warn(
    "⚠️ Using deprecated deleteRequest function. Please use RequestApi.deleteRequest() or useDeleteRequest() hook instead."
  );
  return RequestApi.deleteRequestLegacy(requestId, teamId);
}

//////////////////////////
// Legacy Requests Tab Data //
//////////////////////////

/**
 * @deprecated Use useGetRequestsTabData() hook instead
 */
export async function getRequestsTabData(teamId: string) {
  console.warn(
    "⚠️ Using deprecated getRequestsTabData function. Please use useGetRequestsTabData() hook instead."
  );
  try {
    const requestsTabData = await Promise.all([
      getAllWorkers(teamId),
      getAllShifts(teamId),
      getRequests(teamId),
      getShiftOptions(teamId),
    ]);
    return {
      workers: requestsTabData[0],
      shifts: requestsTabData[1],
      requests: requestsTabData[2],
      shiftOptions: requestsTabData[3],
    };
  } catch (error) {
    console.error("Failed to fetch requests tab data:", error);
    throw new Error(
      "Failed to fetch requests tab data, please try again later"
    );
  }
}
