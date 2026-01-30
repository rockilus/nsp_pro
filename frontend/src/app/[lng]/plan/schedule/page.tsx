"use client";

import React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import ScheduleTab from "../../../../components/schedule/schedule-tab";
import { AccessGuard } from "@/components/access/access-guard";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
import { SqsSolveProvider } from "../../../../app/lib/contexts/SqsSolveContext";
// Styles
import "../../../../styles/page.css";
// Types
import { TeamMembershipRole } from "@/types/team";

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { user } = useUser();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    selectedTeam &&
    user && (
      <AccessGuard route="/schedule" teamWithMembership={selectedTeam}>
        <div className="page-layout">
          <ReactQueryProvider>
            <SqsSolveProvider>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={
                  lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"
                }
              >
                <ScheduleTab lng={lng} teamWithMembership={selectedTeam} />
              </LocalizationProvider>
            </SqsSolveProvider>
          </ReactQueryProvider>
        </div>
      </AccessGuard>
    )
  );
}
