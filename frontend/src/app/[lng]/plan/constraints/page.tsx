"use client";

// Components
import ConstraintTab from "../../../../components/constraints/constraint-tab";
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
      allowedRoles={PageRolePermissions.constraints}
    >
      <div className="page-layout">
        <ConstraintTab
          lng={lng}
          selectedTeamId={selectedTeam?.team.id || null}
        />
      </div>
    </RoleBased>
  );
}
