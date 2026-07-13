import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
// MUI
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
// Styles
import './invitations-list.css';
// Types
import { WorkerT } from '@/types/worker';
import { TeamInvitationT, TeamInvitationType } from '@/types/team-invitation';

dayjs.extend(duration);

export default function InvitationsList({
  lng,
  invitations,
  workers,
  handleResendTeamInvitationEmail,
  handleDeleteTeamInvitation,
}: {
  lng: string;
  invitations: TeamInvitationT[];
  workers: WorkerT[];
  handleResendTeamInvitationEmail: (invitationId: string) => Promise<void>;
  handleDeleteTeamInvitation: (invitationId: string) => Promise<void>;
}) {
  const { t } = useTranslation(lng, 'teams-page');

  const getExpirationStatus = (expiresAt: Dayjs): string => {
    const now = dayjs().utc();
    if (now.isAfter(expiresAt)) {
      return t('expired');
    }
    const days = expiresAt.diff(now, 'day');
    return `${days} ${t('days').toLocaleLowerCase()}`;
  };

  const InvitationsListItem = ({
    invitation,
    isFirstItem,
  }: {
    invitation: TeamInvitationT;
    isFirstItem?: boolean;
  }) => {
    const [isResendDisabled, setIsResendDisabled] = useState(false);
    const [countdown, setCountdown] = useState<string | null>(null);

    useEffect(() => {
      const now = dayjs().utc();
      if (invitation.lastSentAt && now.diff(invitation.lastSentAt, 'minute') < 2) {
        setIsResendDisabled(true);
        const remainingSeconds = 120 - now.diff(invitation.lastSentAt, 'second');
        const interval = setInterval(() => {
          const secondsLeft = remainingSeconds - dayjs().utc().diff(now, 'second');
          if (secondsLeft <= 0) {
            setIsResendDisabled(false);
            setCountdown(null);
            clearInterval(interval);
          } else {
            setCountdown(
              `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`,
            );
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [invitation.lastSentAt]);

    const handleResendInvitation = async () => {
      await handleResendTeamInvitationEmail(invitation.id);
    };

    const worker =
      invitation.workerId && workers.find((worker) => worker.id === invitation.workerId);

    return (
      <div key={invitation.id} className={`invites-list-item ${isFirstItem ? 'first-item' : ''}`}>
        <div className="team-list-item-description">
          <strong className="invites-list-item-name">{`${invitation.firstName} ${invitation.lastName}`}</strong>
        </div>
        <div className="invites-list-item-info-container">
          <span className="invites-list-item-info">{invitation.email}</span>
          <span className="invites-list-item-info-divider">|</span>
          <span className="invites-list-item-info">
            {invitation.type === TeamInvitationType.OWNER ? t('role_owner') : t('role_member')}
          </span>
          <span className="invites-list-item-info-divider">|</span>
          {worker && (
            <>
              <span className="invites-list-item-info">{worker.name || ''}</span>
              <span className="invites-list-item-info-divider">|</span>
            </>
          )}
          <span className="invites-list-item-info">
            {getExpirationStatus(invitation.expiresAt)}
          </span>
        </div>
        <div className="members-list-item-actions">
          <div className="resend-invitation-container">
            <Button
              variant="outlined"
              onClick={handleResendInvitation}
              disabled={isResendDisabled}
              sx={{
                textTransform: 'none',
                marginRight: '8px',
                fontSize: '12px',
                padding: '3px 12px',
              }}
            >
              {t('resend_invite')}
            </Button>
            {countdown && (
              <span className="resend-countdown">
                {t('available_in')}: {countdown}
              </span>
            )}
          </div>
          <Button
            variant="outlined"
            onClick={() => handleDeleteTeamInvitation(invitation.id)}
            color="error"
            sx={{
              textTransform: 'none',
              fontSize: '12px',
              padding: '3px 0',
              height: '100%',
            }}
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="invites-list-container">
      {invitations.map((invitation, index) => (
        <InvitationsListItem
          key={invitation.id}
          invitation={invitation}
          isFirstItem={index === 0}
        />
      ))}
    </div>
  );
}
