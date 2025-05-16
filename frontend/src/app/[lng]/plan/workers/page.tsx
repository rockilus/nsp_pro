"use client";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import WorkerTab from "../../../../components/workers/worker-tab";
import { RoleBased } from "@/components/access/role-based";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../styles/page.css";
// Types
import { PageRolePermissions } from "@/types/user";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const { selectedTeam } = useTeam();

  return (
    <RoleBased
      role={selectedTeam?.membership.role || null}
      allowedRoles={PageRolePermissions.workers}
    >
      <div className="page-layout">
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale={lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"}
        >
          <WorkerTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
        </LocalizationProvider>
      </div>
    </RoleBased>
  );
}
