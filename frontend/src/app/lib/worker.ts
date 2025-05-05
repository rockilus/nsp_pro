import axios from "axios";
import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getDimensions } from "./dimension";
import { getSpecialties } from "./specialty";
// Types
import { WorkerT } from "../../types/worker";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlWorkers = API_URL + "/workers";

export const toWorkerT = (data: any): WorkerT => {
  return {
    ...data,
    employmentStartDate: dayjs.unix(data.employmentStartDate).utc(),
    employmentEndDate: data.employmentEndDate
      ? dayjs.unix(data.employmentEndDate).utc()
      : null,
  };
};

export const fromWorkerT = (data: WorkerT): any => {
  return {
    ...data,
    employmentStartDate: data.employmentStartDate.unix(),
    employmentEndDate: data.employmentEndDate
      ? data.employmentEndDate.unix()
      : null,
  };
};

//////////////////////////
// Worker //
//////////////////////////

export async function addWorker(worker: WorkerT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromWorkerT(worker)),
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
    return toWorkerT(responseData) as WorkerT;
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
    return responseData.map(toWorkerT);
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
    return responseData.map(toWorkerT);
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
    body: JSON.stringify(fromWorkerT(updatedWorker)),
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
    return toWorkerT(responseData) as WorkerT;
  } catch (error) {
    console.error("Failed to update worker:", error);
    throw new Error("Failed to update worker, please try again later");
  }
}

/**
 * Sends a request to add a user to a worker.
 * @param {string} workerId - The ID of the worker.
 * @param {string} userId - The ID of the user to add.
 * @param {string} teamId - The ID of the team the worker belongs to.
 * @returns {Promise<WorkerDTO>} A promise resolving to the updated worker.
 */
export const attachUserToWorker = async (
  workerId: string,
  userId: string,
  teamId: string
): Promise<WorkerT> => {
  try {
    const response = await axios.post(
      `${apiUrlWorkers}/workers/${workerId}/attach_user`,
      {
        user_id: userId,
        team_id: teamId,
      }
    );
    return response.data.map(toWorkerT);
  } catch (error) {
    console.error("Error adding user to worker:", error);
    throw error;
  }
};

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
      getSpecialties(teamId),
    ]);
    return {
      workers: workersTabData[0],
      dimensions: workersTabData[1].dimensions,
      dimEntries: workersTabData[1].dimEntries,
      specialties: workersTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch workers tab data:", error);
    throw new Error("Failed to fetch workers tab data, please try again later");
  }
}
