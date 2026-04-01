"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// Components
import TeamSettingsLayout from "@/components/teams-settings/team-settings-layout";
import MobileNavAppBar from "@/components/app-bar/mobile-nav-app-bar";
import { AccessGuard } from "@/components/access/access-guard";
// Context
import { useTeam } from "@/context/TeamContext";
// Hooks
import { useIsMobile } from "@/hooks/useIsMobile";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedTeam, teams, loading, setSelectedTeamId } = useTeam();
  const { lng } = React.use(params as Promise<{ lng: string }>);
  const isMobile = useIsMobile();

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
          `❌ Invalid team ID: ${teamId}, redirecting to team selection`,
        );
        router.replace(`/${lng}/plan/settings/teams`);
        return;
      }
    } else {
      // No team ID specified, redirect to team selection
      console.log("❌ No team ID specified, redirecting to team selection");
      router.replace(`/${lng}/plan/settings/teams`);
      return;
    }
  }, [teamId, teams, selectedTeam, setSelectedTeamId, loading, router, lng]);

  // Security: Redirect to team selection if no teams available
  useEffect(() => {
    if (!loading && teams.length === 0) {
      console.log("🔄 No teams available, redirecting to team selection");
      router.replace(`/${lng}/plan/settings/teams`);
    }
  }, [teams, loading, router, lng]);

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
    <AccessGuard route="/teams" teamWithMembership={selectedTeam}>
      {isMobile && <MobileNavAppBar lng={lng} />}
      <TeamSettingsLayout params={{ lng }}>{children}</TeamSettingsLayout>
    </AccessGuard>
  );
}
