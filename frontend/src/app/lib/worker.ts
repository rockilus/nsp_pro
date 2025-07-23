/**
 * Legacy worker API functions
 *
 * @deprecated These functions are deprecated and will be removed in a future version.
 * Please use the new WorkerApi class and useWorker hooks instead.
 *
 * Migration guide:
 * - Replace direct function calls with appropriate hooks from useWorker.ts
 * - Use WorkerApi class for non-React contexts
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getDimensions } from "./dimension";
import { getSpecialties } from "./specialty";
// Types
import { WorkerT } from "../../types/worker";
// New API Client
import { WorkerApi } from "./api/workerApi";

dayjs.extend(utc);

// Legacy transformation functions - exported for backward compatibility
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
// Legacy Worker Functions //
//////////////////////////

/**
 * @deprecated Use WorkerApi.addWorker() or useAddWorker() hook instead
 */
export async function addWorker(worker: WorkerT): Promise<WorkerT> {
  console.warn(
    "⚠️ addWorker is deprecated. Use WorkerApi.addWorker() or useAddWorker() hook instead"
  );
  return WorkerApi.addWorkerLegacy(worker);
}

/**
 * @deprecated Use WorkerApi.getWorkers() or useGetWorkers() hook instead
 */
export async function getWorkers(teamId: string): Promise<WorkerT[]> {
  console.warn(
    "⚠️ getWorkers is deprecated. Use WorkerApi.getWorkers() or useGetWorkers() hook instead"
  );
  return WorkerApi.getWorkersLegacy(teamId);
}

/**
 * @deprecated Use WorkerApi.getAllWorkers() or useGetAllWorkers() hook instead
 */
export async function getAllWorkers(teamId: string): Promise<WorkerT[]> {
  console.warn(
    "⚠️ getAllWorkers is deprecated. Use WorkerApi.getAllWorkers() or useGetAllWorkers() hook instead"
  );
  return WorkerApi.getAllWorkersLegacy(teamId);
}

/**
 * @deprecated Use WorkerApi.updateWorker() or useUpdateWorker() hook instead
 */
export async function updateWorker(updatedWorker: WorkerT): Promise<WorkerT> {
  console.warn(
    "⚠️ updateWorker is deprecated. Use WorkerApi.updateWorker() or useUpdateWorker() hook instead"
  );
  return WorkerApi.updateWorkerLegacy(updatedWorker);
}

/**
 * @deprecated Use WorkerApi.attachUserToWorker() or useAttachUserToWorker() hook instead
 */
export const attachUserToWorker = async (
  workerId: string,
  userId: string,
  teamId: string
): Promise<WorkerT> => {
  console.warn(
    "⚠️ attachUserToWorker is deprecated. Use WorkerApi.attachUserToWorker() or useAttachUserToWorker() hook instead"
  );
  return WorkerApi.attachUserToWorkerLegacy(workerId, userId, teamId);
};

/**
 * @deprecated Use WorkerApi.deleteWorker() or useDeleteWorker() hook instead
 */
export async function deleteWorker(
  workerId: string,
  teamId: string
): Promise<void> {
  console.warn(
    "⚠️ deleteWorker is deprecated. Use WorkerApi.deleteWorker() or useDeleteWorker() hook instead"
  );
  const success = await WorkerApi.deleteWorkerLegacy(workerId, teamId);
  if (!success) {
    throw new Error("Failed to delete worker");
  }
}

//////////////////////////
// Workers Tab Data //
//////////////////////////

/**
 * @deprecated Use useGetWorkersTabData() hook instead
 */
export async function getWorkersTabData(teamId: string) {
  console.warn(
    "⚠️ getWorkersTabData is deprecated. Use useGetWorkersTabData() hook instead"
  );
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
