import React, { useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import WorkerTable from "./WorkerTable";
// Stores
import { useWorkerStore } from "../../stores/workerStore";
import { useWorkerDimensionStore } from "../../stores/workerDimensionStore";
// Types
import { TeamT } from "../../containers/types";
// Constants
import { DefaultWorkerFields } from "../../utils/constants";

interface Props {
  team: TeamT;
}

export default function WorkerTab({ team }: Props) {
  const workers = useWorkerStore((state) => state.workers);
  const fetchWorkers = useWorkerStore((state) => state.fetchWorkers);

  const workerDimensions = useWorkerDimensionStore(
    (state) => state.workerDimensions
  );
  const fetchWorkerDimensions = useWorkerDimensionStore(
    (state) => state.fetchWorkerDimensions
  );

  useEffect(() => {
    fetchWorkers(team.id);
  }, [fetchWorkers, team.id]);

  useEffect(() => {
    fetchWorkerDimensions(team.id);
  }, [fetchWorkerDimensions, team.id]);

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Workers Configuration
      </Typography>
      <WorkerTable
        team={team}
        workerDimensions={workerDimensions}
        workers={workers}
        defaultWorkerFields={DefaultWorkerFields}
      />
    </Box>
  );
}
