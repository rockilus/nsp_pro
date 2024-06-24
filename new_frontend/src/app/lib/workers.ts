import { unstable_noStore as noStore } from "next/cache";
// Types
import { WorkerT, WorkerDimensionT, WorkerPropertyT } from "@/types/worker";

const apiUrlWorkers = process.env.NEXT_PUBLIC_API_URL + "/workers";
const apiUrlWorkerDimensions =
  process.env.NEXT_PUBLIC_API_URL + "/worker-dimensions";

//////////////////////////
// Worker //
//////////////////////////

export async function getworkers(teamId: string) {
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

//////////////////////////
// Worker Dimensions //
//////////////////////////

export async function getWorkerDimensions(teamId: string) {
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
      `${apiUrlWorkerDimensions}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch worker dimensions: " + responseData.detail
      );
    }
    return responseData as WorkerDimensionT[];
  } catch (error) {
    console.error("Failed to fetch worker dimensions:", error);
    throw new Error(
      "Failed to fetch worker dimensions, please try again later"
    );
  }
}

export async function addWorkerDimension(workerDimension: WorkerDimensionT) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workerDimension),
  };
  try {
    const response = await fetch(
      `${apiUrlWorkerDimensions}/teams/${workerDimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add worker dimension: " + responseData.detail);
    }
    return responseData as {
      newDimension: WorkerDimensionT;
      newProperties: WorkerPropertyT[];
    };
  } catch (error) {
    console.error("Failed to add worker dimension:", error);
    throw new Error("Failed to add worker dimension, please try again later");
  }
}

export async function updateWorkerDimension(
  updatedWorkerDimension: WorkerDimensionT
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedWorkerDimension),
  };
  try {
    const response = await fetch(
      `${apiUrlWorkerDimensions}/${updatedWorkerDimension.id}/teams/${updatedWorkerDimension.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to update worker dimension: " + responseData.detail
      );
    }
    return responseData as WorkerDimensionT;
  } catch (error) {
    console.error("Failed to update worker dimension:", error);
    throw new Error(
      "Failed to update worker dimension, please try again later"
    );
  }
}

export async function deleteWorkerDimension(
  workerDimensionId: string,
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
      `${apiUrlWorkerDimensions}/${workerDimensionId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to delete worker dimension: " + responseData.detail
      );
    }
  } catch (error) {
    console.error("Failed to delete worker dimension:", error);
    throw new Error(
      "Failed to delete worker dimension, please try again later"
    );
  }
}

//////////////////////////
// Worker Properties //
//////////////////////////

export async function updateWorkerProperty(
  workerProperty: WorkerPropertyT,
  teamId: string
) {
  const options: RequestInit = {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workerProperty),
  };
  try {
    const response = await fetch(
      `${apiUrlWorkers}/${workerProperty.workerId}/properties/${workerProperty.workerDimensionId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to update worker property: " + responseData.detail
      );
    }
    return responseData as WorkerPropertyT;
  } catch (error) {
    console.error("Failed to update worker property:", error);
    throw new Error("Failed to update worker property, please try again later");
  }
}

//////////////////////////
// Workers Tab Data //
//////////////////////////

export async function getWorkersTabData(teamId: string) {
  try {
    const workersTabData = await Promise.all([
      getworkers(teamId),
      getWorkerDimensions(teamId),
    ]);
    return { workers: workersTabData[0], workerDimensions: workersTabData[1] };
  } catch (error) {
    console.error("Failed to fetch workers tab data:", error);
    throw new Error("Failed to fetch workers tab data, please try again later");
  }
}
