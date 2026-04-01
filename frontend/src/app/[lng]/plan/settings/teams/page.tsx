'use client';

import React from 'react';
// Components
import TeamsTab from '../../../../../components/settings/teams/teams-tab';
// Context
import { useTeam } from '@/context/TeamContext';
import { useUser } from '@/context/UserContext';
// Styles
import '../../../../../styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { lng } = React.use(params as Promise<{ lng: string }>);
  return (
    <div className="page-layout">
      <TeamsTab lng={lng} teamId={selectedTeam?.team.id || null} />
    </div>
  );
}
