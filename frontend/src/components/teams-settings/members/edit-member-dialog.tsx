import React, { useState } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserWithMembership } from '@/types/user';
import { TeamMembershipRole } from '@/types/team';
import { WorkerT } from '@/types/worker';

interface EditMemberDialogProps {
  lng: string;
  teamId: string;
  userWithMembership: UserWithMembership;
  workers: WorkerT[];
  isLastOwner: boolean;
  handleUpdateMemberRole: (userId: string, newRole: string) => Promise<void>;
  handleAttachUserToWorker: (workerId: string, userId: string, teamId: string) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditMemberDialog({
  lng,
  teamId,
  userWithMembership,
  workers,
  isLastOwner,
  handleUpdateMemberRole,
  handleAttachUserToWorker,
  open,
  onOpenChange,
}: EditMemberDialogProps) {
  const { t } = useTranslation(lng, 'teams-page');

  const currentRole = userWithMembership.membership.role.valueOf() as string;
  const currentWorker = workers.find((w) => w.userId === userWithMembership.user.id);
  const currentWorkerId = currentWorker?.id || '';

  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedWorkerId, setSelectedWorkerId] = useState(currentWorkerId);

  const handleSave = async () => {
    if (selectedRole !== currentRole) {
      await handleUpdateMemberRole(userWithMembership.user.id, selectedRole);
    }
    if (selectedWorkerId !== currentWorkerId) {
      await handleAttachUserToWorker(selectedWorkerId, userWithMembership.user.id, teamId);
    }
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedRole(currentRole);
      setSelectedWorkerId(currentWorkerId);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="edit-member-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit_member')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('role')}</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isLastOwner}>
              <SelectTrigger data-testid="edit-member-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value={TeamMembershipRole.MEMBER}
                  data-testid="edit-member-role-option-member"
                >
                  {t('role_member')}
                </SelectItem>
                <SelectItem
                  value={TeamMembershipRole.OWNER}
                  data-testid="edit-member-role-option-owner"
                >
                  {t('role_owner')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('worker')}</Label>
            <Select value={selectedWorkerId || ''} onValueChange={setSelectedWorkerId}>
              <SelectTrigger data-testid="edit-member-worker-select">
                <SelectValue placeholder={t('no_worker')} />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem
                    key={worker.id}
                    value={worker.id}
                    disabled={
                      worker.userId !== null && worker.userId !== userWithMembership.user.id
                    }
                    data-testid={`edit-member-worker-option-${worker.id}`}
                  >
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="edit-member-cancel-button"
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} data-testid="edit-member-save-button">
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
