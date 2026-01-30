"use client";

import React from "react";
// Components
import ShiftTab from "../../../../components/shifts/shift-tab";
import { AccessGuard } from "@/components/access/access-guard";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../styles/page.css";

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    selectedTeam && (
      <AccessGuard route="/shifts" teamWithMembership={selectedTeam}>
        <div className="page-layout">
          <ShiftTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
        </div>
      </AccessGuard>
    )
  );
}
