import React from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
// Components
import RequestPanelContent from "./request-panel-content";
// Types
import { RequestT } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";
import { ShiftWorkerOptionT } from "@/types/constraint";

export default function RequestPanel({
  lng,
  teamId,
  isEdit,
  request = null,
  workers,
  shifts,
  shiftOptions,
  userWorkerId,
  userTeamRole,
  handleAddRequest,
  handleUpdateRequest,
  handleDeleteRequest,
  handleRescindRequest,
  handleAcceptRequest,
  handleDenyRequest,
  hideButton = false,
  onClose,
}: {
  lng: string;
  teamId: string;
  isEdit: boolean;
  request?: RequestT | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleAddRequest: (request: RequestT) => void;
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest?: (requestId: string) => void;
  handleRescindRequest?: (requestId: string) => void;
  handleAcceptRequest?: (requestId: string) => void;
  handleDenyRequest?: (requestId: string) => void;
  hideButton?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation(lng, "request-page");

  const [open, setOpen] = React.useState<boolean>(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Call external onClose if provided
    if (onClose) {
      onClose();
    }
  };

  // Initialize with request data if provided (for calendar usage)
  React.useEffect(() => {
    if (request && hideButton) {
      // Auto-open for calendar usage (both create and edit scenarios)
      setOpen(true);
    }
  }, [request, hideButton]);

  const id = open ? "request-dialog" : undefined;

  return (
    <div>
      {!hideButton && (
        <>
          {isEdit && request ? (
            <IconButton
              edge="end"
              aria-label="edit"
              data-testid={`edit-request-button-${request.id}`}
              disabled={
                userTeamRole === TeamMembershipRole.MEMBER &&
                (!userWorkerId || request.workerId !== userWorkerId)
              }
              onClick={handleClick}
            >
              <EditIcon />
            </IconButton>
          ) : (
            <Button
              aria-describedby={id}
              variant="contained"
              disabled={
                userTeamRole === TeamMembershipRole.MEMBER && !userWorkerId
              }
              onClick={handleClick}
              sx={{
                textTransform: "none",
              }}
              data-testid="new-request-button"
            >
              {t("new_request")}
            </Button>
          )}
        </>
      )}
      <Dialog
        id={id}
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        data-testid="request-panel-dialog"
      >
        <DialogTitle>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{t("new_request")}</span>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
              // primary test id expected by E2E tests
              data-testid="close-request-dialog-button"
              // preserve legacy id for any internal selectors (kept as legacy data attribute)
              data-legacy-testid="close-request-panel-button"
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          <RequestPanelContent
            lng={lng}
            teamId={teamId}
            isEdit={isEdit}
            request={request}
            workers={workers}
            shifts={shifts}
            shiftOptions={shiftOptions}
            userWorkerId={userWorkerId}
            userTeamRole={userTeamRole}
            handleAddRequest={handleAddRequest}
            handleUpdateRequest={handleUpdateRequest}
            handleDeleteRequest={handleDeleteRequest}
            handleRescindRequest={handleRescindRequest}
            handleAcceptRequest={handleAcceptRequest}
            handleDenyRequest={handleDenyRequest}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
