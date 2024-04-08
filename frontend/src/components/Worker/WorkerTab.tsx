import React, { useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import WorkerTable from "./WorkerTable";
// Types
import { WorkerT, WorkerDimensionT } from "./types";
import { TeamT } from "../../containers/types";
// Constants
import { DefaultWorkerFields } from "../../utils/constants";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  workerDimensions: WorkerDimensionT[];
}

export default function WorkerTab({ team, workers, workerDimensions }: Props) {
  return (
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <WorkerTable
        team={team}
        workerDimensions={workerDimensions}
        workers={workers}
        defaultWorkerFields={DefaultWorkerFields}
      />
    </Box>
  );
}
