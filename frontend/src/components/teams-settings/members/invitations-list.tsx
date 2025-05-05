import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../app/i18n/client";
import dayjs, { Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration";
// MUI
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
// Styles
import "./members-list.css";
// Types
import { WorkerT } from "@/types/worker";
import { TeamInvitationT } from "@/types/team-invitation";

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
  const { t } = useTranslation(lng, "teams-page");

  const getExpirationStatus = (expiresAt: Dayjs): string => {
    const now = dayjs().utc();
    if (now.isAfter(expiresAt)) {
      return t("expired");
    }
    const days = expiresAt.diff(now, "day");
    return `${days} ${t("days").toLocaleLowerCase()}`;
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
      if (
        invitation.lastSentAt &&
        now.diff(invitation.lastSentAt, "minute") < 2
      ) {
        setIsResendDisabled(true);
        const remainingSeconds =
          120 - now.diff(invitation.lastSentAt, "second");
        const interval = setInterval(() => {
          const secondsLeft =
            remainingSeconds - dayjs().utc().diff(now, "second");
          if (secondsLeft <= 0) {
            setIsResendDisabled(false);
            setCountdown(null);
            clearInterval(interval);
          } else {
            setCountdown(
              `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60)
                .toString()
                .padStart(2, "0")}`
            );
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [invitation.lastSentAt]);

    const handleResendInvitation = async () => {
      await handleResendTeamInvitationEmail(invitation.id);
    };

    return (
      <div
        key={invitation.id}
        className={`teams-list-item ${isFirstItem ? "first-item" : ""}`}
      >
        <div className="team-list-item-description">
          <strong className="teams-list-item-name">{invitation.email}</strong>
          <span className="teams-list-item-worker">
            {invitation.workerId
              ? workers.find((worker) => worker.id === invitation.workerId)
                  ?.name || ""
              : ""}
          </span>
          <span className="teams-list-item-expiration">
            {getExpirationStatus(invitation.expiresAt)}
          </span>
        </div>
        <div className="members-list-item-actions">
          <Button
            variant="outlined"
            onClick={handleResendInvitation}
            disabled={isResendDisabled}
            sx={{
              textTransform: "none",
              marginRight: "8px",
              fontSize: "12px",
              padding: "3px 12px",
            }}
          >
            {t("resend_invitate")}
          </Button>
          {countdown && (
            <span className="resend-countdown">
              {t("available_in")}: {countdown}
            </span>
          )}
          <Button
            variant="outlined"
            onClick={() => handleDeleteTeamInvitation(invitation.id)}
            color="error"
            sx={{
              textTransform: "none",
              fontSize: "12px",
              padding: "3px 0",
              height: "100%",
            }}
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="teams-list-container">
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
