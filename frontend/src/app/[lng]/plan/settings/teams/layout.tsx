"use client";

// Components
import TeamSettingsLayout from "@/components/teams-settings/team-settings-layout";
import { RoleBased } from "@/components/access/role-based";
// Context
import { useTeam } from "@/context/TeamContext";
// Types
import { PageRolePermissions } from "@/types/user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  const { selectedTeam, teams } = useTeam();
  const router = useRouter();

  // Redirect to team selection if no team is selected
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      router.push(`/${params.lng}/plan/teams`);
    }
  }, [selectedTeam, teams, router, params.lng]);

  // Don't render settings if no team is selected
  if (!selectedTeam) {
    return null;
  }

  return (
    <RoleBased
      role={selectedTeam.membership.role}
      allowedRoles={PageRolePermissions.teams}
    >
      <TeamSettingsLayout params={params}>{children}</TeamSettingsLayout>
    </RoleBased>
  );
}
