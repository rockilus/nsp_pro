"use client";

import React from "react";
// Components
import ShiftTab from "../../../../components/shifts/shift-tab";
import { RoleBased } from "@/components/access/role-based";
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
    <RoleBased
      role={selectedTeam?.membership.role || null}
      allowedRoles={PageRolePermissions.shifts}
    >
      <div className="page-layout">
        <ShiftTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
      </div>
    </RoleBased>
  );
}
