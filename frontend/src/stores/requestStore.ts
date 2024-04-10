import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { RequestT } from "../components/FixedAssignmentRequest/types";

const apiUrlRequests = process.env.NEXT_PUBLIC_API_URL + "/requests";

type RequestStateT = {
  requests: RequestT[];
  fetchRequests: (teamId: string) => void;
  fetchRequestsStore: (requests: RequestT[]) => void;
  addRequest: (request: RequestT, teamId: string) => void;
  updateRequest: (updatedRequest: RequestT, teamId: string) => void;
  deleteRequest: (requestId: string, teamId: string) => void;
};

const toRequestT = (data: any) => {
  const r: RequestT = {
    ...data,
    date: new Date(data.date),
  };
  return r;
};

export const useRequestStore = create<RequestStateT>()((set) => ({
  requests: [],

  fetchRequests: async (teamId) => {
    try {
      const response = await fetch(`${apiUrlRequests}/teams/${teamId}`, {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch requests: " + responseData.detail,
            "error"
          );
        return;
      }
      const requests = responseData.map(toRequestT);
      set({ requests });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch requests, please try again later",
          "error"
        );
    }
  },

  fetchRequestsStore: (requests) => {
    set({ requests });
  },

  addRequest: async (request, teamId) => {
    try {
      const response = await fetch(`${apiUrlRequests}/teams/${teamId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to add request: " + responseData.detail,
            "error"
          );
        return;
      }
      const newRequest = toRequestT(responseData);
      set((state) => ({
        requests: [...state.requests, newRequest],
      }));
    } catch (error) {
      console.error("Failed to add request:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to add request, please try again later",
          "error"
        );
    }
  },

  updateRequest: async (updatedRequest, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlRequests}/${updatedRequest.id}/teams/${teamId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedRequest),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update request: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        requests: state.requests.map((fa) =>
          fa.id === updatedRequest.id ? updatedRequest : fa
        ),
      }));
    } catch (error) {
      console.error("Failed to update request:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update request, please try again later",
          "error"
        );
    }
  },

  deleteRequest: async (requestId, teamId) => {
    try {
      const response = await fetch(
        `${apiUrlRequests}/${requestId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to delete request: " + responseData.detail,
            "error"
          );
        return;
      }
      set((state) => ({
        requests: state.requests.filter((fa) => fa.id !== requestId),
      }));
    } catch (error) {
      console.error("Failed to delete request:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to delete request, please try again later",
          "error"
        );
    }
  },
}));
