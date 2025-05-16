"use client";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import ScheduleTab from "../../../../components/schedule/schedule-tab";
import ScheduleTabMember from "@/components/schedule/schedule-tab-member";
import { RoleBased } from "@/components/access/role-based";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
// Styles
import "../../../../styles/page.css";
// Types
import { PageRolePermissions } from "@/types/user";
import { TeamMembershipRole } from "@/types/team";

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
        role={selectedTeam?.membership.role || null}
        allowedRoles={PageRolePermissions.schedule}
      >
        <div className="page-layout">
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale={lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"}
          >
            {selectedTeam.membership.role === TeamMembershipRole.OWNER ? (
              <ScheduleTab lng={lng} teamWithMembership={selectedTeam} />
            ) : (
              <ScheduleTabMember lng={lng} teamWithMembership={selectedTeam} />
            )}
          </LocalizationProvider>
        </div>
      </RoleBased>
    )
  );
}
