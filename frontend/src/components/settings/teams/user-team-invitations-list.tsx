import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
// MUI
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
// Styles
import './user-team-invitations-list.css';
// Types
import { EnrichedTeamInvitationT } from '@/types/team-invitation';

dayjs.extend(duration);

export default function UserTeamInvitationsList({
  lng,
  invitations,
  handleAcceptInvitation,
  handleRejectInvitation,
}: {
  lng: string;
  invitations: EnrichedTeamInvitationT[];
  handleAcceptInvitation: (token: string) => void;
  handleRejectInvitation: (token: string) => void;
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
    invitation: EnrichedTeamInvitationT;
    isFirstItem?: boolean;
  }) => {
    return (
      <div key={invitation.id} className={`invites-list-item ${isFirstItem ? 'first-item' : ''}`}>
        <div className="team-list-item-description">
          <strong className="invites-list-item-name">{invitation.teamName}</strong>
        </div>
        <div className="invites-list-item-info-container">
          {invitation.creatorName && (
            <>
              <span className="invites-list-item-info">{invitation.creatorName}</span>
              <span className="invites-list-item-info-divider">|</span>
            </>
          )}
          <span className="invites-list-item-info">
            {getExpirationStatus(invitation.expiresAt)}
          </span>
        </div>
        <div className="members-list-item-actions">
          <IconButton
            size="small"
            color="default"
            onClick={() => {
              handleRejectInvitation(invitation.token);
            }}
            sx={{
              border: '1px solid #0000008a',
            }}
          >
            <CloseIcon color="action" fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              handleAcceptInvitation(invitation.token);
            }}
            sx={{
              border: '1px solid #1976d2',
              marginLeft: '8px',
            }}
          >
            <CheckIcon color="primary" fontSize="small" />
          </IconButton>
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
