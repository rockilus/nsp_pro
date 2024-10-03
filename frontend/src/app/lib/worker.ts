import { unstable_noStore as noStore } from "next/cache";
// Actions
import { getDimensions } from "./dimension";
// Types
import { WorkerT } from "../../types/worker";
import { DimensionType } from "../../types/dimension";
// Env Vars
import { API_URL } from "./env";

const apiUrlWorkers = API_URL + "/workers";

//////////////////////////
// Worker //
//////////////////////////

export async function addWorker(worker: WorkerT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(worker),
  };
  try {
    const response = await fetch(
      `${apiUrlWorkers}/teams/${worker.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add worker: " + responseData.detail);
    }
    return responseData as WorkerT;
  } catch (error) {
    console.error("Failed to add worker:", error);
    throw new Error("Failed to add worker, please try again later");
  }
}

export async function getWorkers(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlWorkers}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch workers: " + responseData.detail);
    }
    return responseData as WorkerT[];
  } catch (error) {
    console.error("Failed to fetch workers:", error);
    throw new Error("Failed to fetch workers, please try again later");
  }
}

export async function getAllWorkers(teamId: string) {
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
      `${apiUrlWorkers}/all/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch workers: " + responseData.detail);
    }
    return responseData as WorkerT[];
  } catch (error) {
    console.error("Failed to fetch workers:", error);
    throw new Error("Failed to fetch workers, please try again later");
  }
}

export async function updateWorker(updatedWorker: WorkerT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedWorker),
  };
  try {
    const response = await fetch(
      `${apiUrlWorkers}/${updatedWorker.id}/teams/${updatedWorker.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update worker: " + responseData.detail);
    }
    return responseData as WorkerT;
  } catch (error) {
    console.error("Failed to update worker:", error);
    throw new Error("Failed to update worker, please try again later");
  }
}

export async function deleteWorker(workerId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlWorkers}/${workerId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete worker: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete worker:", error);
    throw new Error("Failed to delete worker, please try again later");
  }
}

//////////////////////////
// Workers Tab Data //
//////////////////////////

export async function getWorkersTabData(teamId: string) {
  try {
    const workersTabData = await Promise.all([
      getWorkers(teamId),
      getDimensions(teamId),
    ]);
    return {
      workers: workersTabData[0],
      dimensions: workersTabData[1].dimensions,
      dimEntries: workersTabData[1].dimEntries,
    };
  } catch (error) {
    console.error("Failed to fetch workers tab data:", error);
    throw new Error("Failed to fetch workers tab data, please try again later");
  }
}
