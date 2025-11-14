"use client";

import React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Components
import CampaignTab from "../../../../components/campaign/campaign-tab";
import { RoleBased } from "@/components/access/role-based";
import { AccessGuard } from "@/components/access/access-guard";

// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../styles/page.css";
// Types
import { PageRolePermissions } from "@/types/user";

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    selectedTeam && (
      <AccessGuard route="/campaign" teamWithMembership={selectedTeam}>
        <div className="page-layout">
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale={lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"}
          >
            <CampaignTab lng={lng} teamWithMembership={selectedTeam} />
          </LocalizationProvider>
        </div>
      </AccessGuard>
    )
  );
}
