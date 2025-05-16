"use client";

// Components
import ShiftTab from "../../../../components/shifts/shift-tab";
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
      allowedRoles={PageRolePermissions.shifts}
    >
      <div className="page-layout">
        <ShiftTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
      </div>
    </RoleBased>
  );
}
