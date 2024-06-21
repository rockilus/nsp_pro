import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
// Components
import WorkerTable from "@/components/workers/WorkerTable";
// Types
import { WorkerT, WorkerDimensionT } from "@/types/worker";
import { TeamT } from "@/types/team";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  workerDimensions: WorkerDimensionT[];
}

export default function WorkerTab({ team, workers, workerDimensions }: Props) {
  const { t } = useTranslation();
  const DefaultWorkerFields: Record<string, string>[] = [
    { name: "name", label: t("common.name") },
  ];
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
