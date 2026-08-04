'use client';

import React from 'react';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import { AccessGuard } from '@/components/access/access-guard';
import { ScheduleTemplatesPage } from '@/components/templates/ScheduleTemplatesPage';
import { useTeam } from '@/context/TeamContext';
import { useUser } from '@/context/UserContext';
import '../../../../styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { selectedTeam } = useTeam();
  const { user } = useUser();
  const { lng } = React.use(params as Promise<{ lng: string }>);

  if (!selectedTeam || !user) return null;

  return (
    <AccessGuard route="/templates" teamWithMembership={selectedTeam}>
      <div className="page-layout">
        <ScheduleTemplatesPage lng={lng} teamWithMembership={selectedTeam} />
      </div>
    </AccessGuard>
  );
}
