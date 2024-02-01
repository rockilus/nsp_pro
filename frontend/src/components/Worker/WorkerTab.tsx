import React, { useEffect } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import WorkerTable from "./WorkerTable";

import { useWorkerStore } from "../../stores/workerStore";
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
import { DefaultWorkerFields } from "../../utils/constants";

export default function WorkerTab() {
  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);

  const workerDimensions = useWorkerDimensionStore(
    (state) => state.workerDimensions
  );
  const fetchWorkerDimensions = useWorkerDimensionStore(
    (state) => state.fetchWorkerDimensions
  );

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    fetchWorkerDimensions();
  }, [fetchWorkerDimensions]);

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Workers Configuration
      </Typography>
      <WorkerTable
        workerDimensions={workerDimensions}
        workers={workers}
        defaultWorkerFields={DefaultWorkerFields}
      />
    </Box>
  );
}
