import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { Pencil } from 'lucide-react';
// shadcn
import { Button } from '@/components/ui/button';
// Components
import RemoveFromTeamDialog from './remove-from-team-dialog';
import EditMemberDialog from './edit-member-dialog';
// Styles
import './members-list.css';
// Types
import { UserWithMembership } from '@/types/user';
import { TeamMembershipRole } from '@/types/team';
import { WorkerT } from '@/types/worker';

const ROLE_BADGE_STYLES: Record<string, string> = {
  [TeamMembershipRole.OWNER]:
    'border-amber-400 text-amber-700 dark:border-amber-500 dark:text-amber-400',
  [TeamMembershipRole.MEMBER]:
    'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300',
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
    const [editOpen, setEditOpen] = useState(false);

    const displayName =
      userWithMembership.user.firstName || userWithMembership.user.lastName
        ? `${userWithMembership.user.firstName} ${userWithMembership.user.lastName}`
        : userWithMembership.user.email;

    const currentRole = userWithMembership.membership.role.valueOf() as string;
    const isLastOwner = currentRole === TeamMembershipRole.OWNER && ownerCount <= 1;
    const badgeStyle =
      ROLE_BADGE_STYLES[currentRole] || ROLE_BADGE_STYLES[TeamMembershipRole.MEMBER];

    return (
      <div
        key={userWithMembership.user.id}
        className={`teams-list-item ${isFirstItem ? 'first-item' : ''}`}
        data-testid={`member-row-${userWithMembership.user.id}`}
      >
        <div className="team-list-item-description">
          <strong className="teams-list-item-name">
            <a>{displayName}</a>
          </strong>
          <span
            className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeStyle}`}
            data-testid={`member-role-badge-${userWithMembership.user.id}`}
          >
            {currentRole === TeamMembershipRole.OWNER ? t('role_owner') : t('role_member')}
          </span>
        </div>
        <span className="teams-list-item-email">{userWithMembership.user.email}</span>
        <div className="members-list-item-actions">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditOpen(true)}
            data-testid={`member-edit-button-${userWithMembership.user.id}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <RemoveFromTeamDialog
            lng={lng}
            teamId={teamId}
            userWithMembership={userWithMembership}
            handleRemoveFromTeam={handleRemoveFromTeam}
          />
        </div>

        <EditMemberDialog
          lng={lng}
          teamId={teamId}
          userWithMembership={userWithMembership}
          workers={workers}
          isLastOwner={isLastOwner}
          handleUpdateMemberRole={handleUpdateMemberRole}
          handleAttachUserToWorker={handleAttachUserToWorker}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </div>
    );
  };

  return (
    <div className="teams-list-container" data-testid="members-list-container">
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
