import { ColumnDefinition } from "../../types/filter";
import { WorkerT } from "../../types/worker";

export const createWorkerColumns = (
  t: (key: string) => string,
  workers: WorkerT[] = []
): ColumnDefinition[] => {
  // Generate unique worker identifiers from the actual workers data
  const uniqueWorkers = workers.map((worker) => ({
    value: worker.id,
    label: worker.name,
  }));

  return [
    {
      id: "workerId", // Use "workerId" to match request table column ID
      label: t("worker"),
      type: "select" as const,
      getValue: (worker: WorkerT) => worker.id,
      getDisplayValue: (worker: WorkerT) => worker.name,
      getOptions: () => uniqueWorkers,
    },
  ];
};
