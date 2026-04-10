'use client';

import React from 'react';
// Components
import ConstraintTab from '../../../../components/constraints/constraint-tab';
import { AccessGuard } from '@/components/access/access-guard';
// Context
import { useTeam } from '@/context/TeamContext';
// Styles
import '../../../../styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    <AccessGuard route="/constraints" teamWithMembership={selectedTeam}>
      <div className="page-layout">
        <ConstraintTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
      </div>
    </AccessGuard>
  );
}
