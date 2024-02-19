// requestStore.ts
import { create } from "zustand";
import { RequestT } from "../components/FixedAssignmentRequest/types";

// const baseApiUrl = "http://localhost:5000";
const baseApiUrl = "http://127.0.0.1:5000";

// Request
const apiUrlRequests = `${baseApiUrl}/requests`;

type RequestStateT = {
  requests: RequestT[];
  fetchRequests: () => void;
  addRequest: (request: RequestT) => Promise<RequestT>;
  updateRequest: (updatedRequest: RequestT) => void;
  deleteRequest: (id: string) => void;
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

  fetchRequests: async () => {
    try {
      const response = await fetch(apiUrlRequests, {
        method: "GET",
        credentials: "include" as RequestCredentials,
        headers: {
          "Content-Type": "application/json",
        },
      }); // Adjust API endpoint as needed
      const data = await response.json();
      const requests = data.map(toRequestT);
      set({ requests });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  },

  addRequest: async (request) => {
    try {
      const response = await fetch(apiUrlRequests, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
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

  updateRequest: async (updatedRequest) => {
    try {
      await fetch(`${apiUrlRequests}/${updatedRequest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedRequest),
      });
      set((state) => ({
        requests: state.requests.map((fa) =>
          fa.id === updatedRequest.id ? updatedRequest : fa
        ),
      }));
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  },

  deleteRequest: async (id) => {
    try {
      await fetch(`${apiUrlRequests}/${id}`, {
        method: "DELETE",
      });
      set((state) => ({
        requests: state.requests.filter((fa) => fa.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete request:", error);
    }
  },
}));
