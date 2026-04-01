import { WorkerT } from '../types/worker';

/**
 * Get worker name by worker ID
 * @param workerId - The worker ID to look up
 * @param workers - Array of workers
 * @returns Worker name or "Unknown Worker" if not found
 */
export function getWorkerName(workerId: string, workers: WorkerT[]): string {
  const worker = workers.find((w) => w.id === workerId);
  return worker ? worker.name : 'Unknown Worker';
}

/**
 * Get worker by worker ID
 * @param workerId - The worker ID to look up
 * @param workers - Array of workers
 * @returns Worker object or undefined if not found
 */
export function getWorkerById(workerId: string, workers: WorkerT[]): WorkerT | undefined {
  return workers.find((w) => w.id === workerId);
}

/**
 * Get worker by user ID
 * @param userId - The user ID to look up
 * @param workers - Array of workers
 * @returns Worker object or undefined if not found
 */
export function getWorkerByUserId(userId: string, workers: WorkerT[]): WorkerT | undefined {
  return workers.find((w) => w.userId === userId);
}
