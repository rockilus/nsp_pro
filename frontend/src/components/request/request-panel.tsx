import React from 'react';
import { useTranslation } from '../../app/i18n/client';
import { useIsMobile } from '../../hooks/useIsMobile';
// shadcn
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
// Components
import { RequestForm } from '@/components/common/RequestForm';
// Types
import { RequestT } from '../../types/request';
import { ShiftT } from '../../types/shift';
import { WorkerT } from '../../types/worker';
import { TeamMembershipRole } from '@/types/team';
import { ShiftWorkerOptionT } from '@/types/constraint';

const RequestPanel = ({
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
  open: externalOpen,
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
  open?: boolean;
}) => {
  const { t } = useTranslation(lng, 'request-page');
  const isMobile = useIsMobile();

  const [internalOpen, setInternalOpen] = React.useState<boolean>(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setInternalOpen(true);
  };

  const handleClose = () => {
    if (externalOpen === undefined) {
      setInternalOpen(false);
    }
    if (onClose) {
      onClose();
    }
  };

  React.useEffect(() => {
    if (request && hideButton && externalOpen === undefined) {
      setInternalOpen(true);
    }
  }, [request, hideButton, externalOpen]);

  const id = open ? 'request-dialog' : undefined;

  return (
    <div data-testid="request-panel">
      {!hideButton && (
        <>
          {isEdit && request ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="edit"
              data-testid={`edit-request-button-${request.id}`}
              disabled={
                userTeamRole === TeamMembershipRole.MEMBER &&
                (!userWorkerId || request.workerId !== userWorkerId)
              }
              onClick={handleClick}
            >
              <Pencil className="size-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              disabled={userTeamRole === TeamMembershipRole.MEMBER && !userWorkerId}
              onClick={handleClick}
              data-testid="new-request-button"
            >
              {t('new_request')}
            </Button>
          )}
        </>
      )}

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
      >
        <DialogContent
          className={isMobile ? 'h-[100dvh] rounded-none p-0 sm:rounded-xl' : 'sm:max-w-lg'}
          showCloseButton={!isMobile}
          data-testid="request-panel-dialog"
        >
          {!isMobile && (
            <DialogHeader>
              <DialogTitle>{isEdit ? t('edit_request') : t('new_request')}</DialogTitle>
            </DialogHeader>
          )}

          <div className={isMobile ? '' : ''}>
            <RequestForm
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
              isMobile={isMobile}
              title={isEdit ? t('edit_request') : t('new_request')}
              fullWidth={isMobile}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

RequestPanel.displayName = 'RequestPanel';

export default React.memo(RequestPanel);
