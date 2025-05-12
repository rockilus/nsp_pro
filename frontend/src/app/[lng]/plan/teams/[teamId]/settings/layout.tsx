"use client";

// Components
import TeamSettingsLayout from "@/components/teams-settings/team-settings-layout";
import { RoleBased } from "@/components/role-based/role-based";
// Context
import { useTeam } from "@/context/TeamContext";
// Types
import { PageRolePermissions } from "@/types/user";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    lng: string;
    teamId: string;
  };
}) {
  const { teams } = useTeam();
  const selectedTeam = teams.find((team) => team.team.id === params.teamId);

  return (
    <RoleBased
      role={selectedTeam?.membership.role || null}
      allowedRoles={PageRolePermissions.teams}
    >
      <TeamSettingsLayout params={params}>{children}</TeamSettingsLayout>
    </RoleBased>
  );
}
