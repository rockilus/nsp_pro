'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
// Components
import TeamGeneralTab from '@/components/teams-settings/general/team-general-tab';
// Styles
import '@/styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  const searchParams = useSearchParams();

  // Extract teamId from query parameters
  const teamId = searchParams.get('teamId');

  // Security: Input validation
  if (!teamId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">Error: Team ID is required</div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <TeamGeneralTab lng={lng} selectedTeamId={teamId} />
    </div>
  );
}
