import React from 'react';
import Link from 'next/link';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
// Components
import RemoveFromTeamDialog from './remove-from-team-dialog';
import EditWorkerPopover from './edit-worker';
// Styles
import './members-list.css';
// Types
import { UserWithMembership } from '@/types/user';
import { TeamMembershipRole } from '@/types/team';
import { WorkerT } from '@/types/worker';

const ROLE_LABELS: Record<string, string> = {
  [TeamMembershipRole.OWNER]: 'role_owner',
  [TeamMembershipRole.MEMBER]: 'role_member',
};

export default function MembersList({
  lng,
  teamId,
  users,
  workers,
  handleRemoveFromTeam,
  handleAttachUserToWorker,
  handleUpdateMemberRole,
}: {
  lng: string;
  teamId: string;
  users: UserWithMembership[];
  workers: WorkerT[];
  handleRemoveFromTeam: (teamId: string, userId: string) => void;
  handleAttachUserToWorker: (workerId: string, userId: string, teamId: string) => Promise<void>;
  handleUpdateMemberRole: (userId: string, newRole: string) => Promise<void>;
}) {
  const { t } = useTranslation(lng, 'teams-page');

  const ownerCount = users.filter((u) => u.membership.role === TeamMembershipRole.OWNER).length;

  const MembersListItem = ({
    userWithMembership,
    isFirstItem,
  }: {
    userWithMembership: UserWithMembership;
    isFirstItem?: boolean;
  }) => {
    const displayName =
      userWithMembership.user.firstName || userWithMembership.user.lastName
        ? `${userWithMembership.user.firstName} ${userWithMembership.user.lastName}`
        : userWithMembership.user.email;

    const currentRole = userWithMembership.membership.role.valueOf() as string;
    const isLastOwner = currentRole === TeamMembershipRole.OWNER && ownerCount <= 1;

    const handleRoleChange = (event: SelectChangeEvent) => {
      const newRole = event.target.value;
      if (newRole !== currentRole) {
        handleUpdateMemberRole(userWithMembership.user.id, newRole);
      }
    };

    return (
      <div
        key={userWithMembership.user.id}
        className={`teams-list-item ${isFirstItem ? 'first-item' : ''}`}
      >
        <div className="team-list-item-description">
          <strong className="teams-list-item-name">
            <a
            // href={`/${lng}/plan/teams/${teamWithMembership.team.id}`}
            >
              {displayName}
            </a>
          </strong>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={currentRole}
              onChange={handleRoleChange}
              disabled={isLastOwner}
              sx={{ fontSize: '0.75rem' }}
            >
              <MenuItem value={TeamMembershipRole.MEMBER}>{t('role_member')}</MenuItem>
              <MenuItem value={TeamMembershipRole.OWNER}>{t('role_owner')}</MenuItem>
            </Select>
          </FormControl>
        </div>
        <span className="teams-list-item-email">{userWithMembership.user.email}</span>
        <div className="members-list-item-actions">
          <EditWorkerPopover
            lng={lng}
            teamId={teamId}
            userId={userWithMembership.user.id}
            workers={workers}
            handleAttachUserToWorker={handleAttachUserToWorker}
          />
          <RemoveFromTeamDialog
            lng={lng}
            teamId={teamId}
            userWithMembership={userWithMembership}
            handleRemoveFromTeam={handleRemoveFromTeam}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="teams-list-container">
      {users.map((teamWithMembership, index) => (
        <MembersListItem
          key={teamWithMembership.user.id}
          userWithMembership={teamWithMembership}
          isFirstItem={index === 0}
        />
      ))}
    </div>
  );
}
