// requestStore.ts
import { create } from "zustand";
// Types
import { RequestT } from "../components/FixedAssignmentRequest/types";
// Constants
import { ApiUrl } from "../utils/env_config";

const apiUrlRequests = ApiUrl + "/requests";

type RequestStateT = {
  requests: RequestT[];
  fetchRequests: (teamId: string) => void;
  addRequest: (request: RequestT, teamId: string) => Promise<RequestT>;
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
      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.status}`);
      }
      const data = await response.json();
      const requests = data.map(toRequestT);
      set({ requests });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
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
      if (!response.ok) {
        throw new Error(`Failed to add request: ${response.status}`);
      }
      const data = await response.json();
      const newRequest = toRequestT(data);
      set((state) => ({
        requests: [...state.requests, newRequest],
      }));
      return newRequest;
    } catch (error) {
      throw Error(`Failed to add request: ${error}`);
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
      if (!response.ok) {
        throw new Error(`Failed to update request: ${response.status}`);
      }
      set((state) => ({
        requests: state.requests.map((fa) =>
          fa.id === updatedRequest.id ? updatedRequest : fa
        ),
      }));
    } catch (error) {
      console.error("Failed to update request:", error);
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
      if (!response.ok) {
        throw new Error(`Failed to delete request: ${response.status}`);
      }
      set((state) => ({
        requests: state.requests.filter((fa) => fa.id !== requestId),
      }));
    } catch (error) {
      console.error("Failed to delete request:", error);
    }
  },
}));
