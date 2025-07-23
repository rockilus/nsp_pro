"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
// Components
import TeamSettingsLayout from "@/components/teams-settings/team-settings-layout";
import { RoleBased } from "@/components/access/role-based";
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
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedTeam, teams, loading, setSelectedTeamId } = useTeam();

  // Extract teamId from query parameters
  const teamId = searchParams.get("teamId");

  // Security: Validate and sync team selection
  useEffect(() => {
    // Don't process if still loading teams data
    if (loading) return;

    if (teamId) {
      // Validate that the teamId exists in user's teams
      const team = teams.find((t) => t.team.id === teamId);

      if (team) {
        // Update selected team if different from current selection
        if (!selectedTeam || selectedTeam.team.id !== teamId) {
          console.log(`🔄 Setting selected team to: ${teamId}`);
          setSelectedTeamId(teamId);
        }
      } else {
        // Security: Invalid team ID, redirect to team selection
        console.warn(
          `❌ Invalid team ID: ${teamId}, redirecting to team selection`
        );
        router.replace(`/${params.lng}/plan/settings/teams`);
        return;
      }
    } else {
      // No team ID specified, redirect to team selection
      console.log("❌ No team ID specified, redirecting to team selection");
      router.replace(`/${params.lng}/plan/settings/teams`);
      return;
    }
  }, [
    teamId,
    teams,
    selectedTeam,
    setSelectedTeamId,
    loading,
    router,
    params.lng,
  ]);

  // Security: Redirect to team selection if no teams available
  useEffect(() => {
    if (!loading && teams.length === 0) {
      console.log("🔄 No teams available, redirecting to team selection");
      router.replace(`/${params.lng}/plan/settings/teams`);
    }
  }, [teams, loading, router, params.lng]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading teams...</div>
      </div>
    );
  }

  // Validation state - show while team is being validated/set
  if (!teamId || !selectedTeam || selectedTeam.team.id !== teamId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading team...</div>
      </div>
    );
  }

  // Team-specific settings pages with role-based access
  return (
    <RoleBased
      role={selectedTeam.membership.role}
      allowedRoles={PageRolePermissions.teams}
    >
      <TeamSettingsLayout params={params}>{children}</TeamSettingsLayout>
    </RoleBased>
  );
}
