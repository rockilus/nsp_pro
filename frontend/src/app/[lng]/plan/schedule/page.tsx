"use client";

import React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import ScheduleTab from "../../../../components/schedule/schedule-tab";
import ScheduleTabMember from "@/components/schedule/schedule-tab-member";
import { RoleBased } from "@/components/access/role-based";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
import { SqsSolveProvider } from "../../../../app/lib/contexts/SqsSolveContext";
// Styles
import "../../../../styles/page.css";
// Types
import { PageRolePermissions } from "@/types/user";
import { TeamMembershipRole } from "@/types/team";

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { user } = useUser();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    selectedTeam &&
    user && (
      <RoleBased
        role={selectedTeam?.membership.role || null}
        allowedRoles={PageRolePermissions.schedule}
      >
        <div className="page-layout">
          <ReactQueryProvider>
            <SqsSolveProvider>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={
                  lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"
                }
              >
                {selectedTeam.membership.role === TeamMembershipRole.OWNER ? (
                  <ScheduleTab lng={lng} teamWithMembership={selectedTeam} />
                ) : (
                  <ScheduleTabMember
                    lng={lng}
                    teamWithMembership={selectedTeam}
                  />
                )}
              </LocalizationProvider>
            </SqsSolveProvider>
          </ReactQueryProvider>
        </div>
      </RoleBased>
    )
  );
}
