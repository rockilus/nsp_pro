"use client";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import RequestTab from "../../../../components/request/request-tab";
import { RoleBased } from "@/components/access/role-based";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
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
  const { user } = useUser();

  return (
    selectedTeam &&
    user && (
      <RoleBased
        role={selectedTeam.membership.role}
        allowedRoles={PageRolePermissions.requests}
      >
        <div className="page-layout">
          <ReactQueryProvider>
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale={
                lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"
              }
            >
              <RequestTab
                lng={lng}
                teamId={selectedTeam.team.id}
                userId={user.id}
                userTeamRole={selectedTeam.membership.role}
              />
            </LocalizationProvider>
          </ReactQueryProvider>
        </div>
      </RoleBased>
    )
  );
}
