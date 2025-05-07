"use client";

// Components
import CoverageTab from "../../../../components/coverages/coverage-tab";
import { RoleBased } from "@/components/role-based/role-based";
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
      allowedRoles={PageRolePermissions.coverages}
    >
      <div className="page-layout">
        <CoverageTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
      </div>
    </RoleBased>
  );
}
