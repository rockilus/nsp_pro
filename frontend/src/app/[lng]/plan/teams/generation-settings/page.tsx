'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import GenerationSettingsTab from '@/components/teams-settings/generation-settings/generation-settings-tab';
import '@/styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">Error: Team ID is required</div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <GenerationSettingsTab lng={lng} selectedTeamId={teamId} />
    </div>
  );
}
