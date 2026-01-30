"use client";

import React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import RequestTab from "../../../../components/request/request-tab";
import { AccessGuard } from "@/components/access/access-guard";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
// Styles
import "../../../../styles/page.css";

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { user } = useUser();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    selectedTeam &&
    user && (
      <AccessGuard route="/requests" teamWithMembership={selectedTeam}>
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
      </AccessGuard>
    )
  );
}
