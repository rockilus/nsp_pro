'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Pencil, Loader2 } from 'lucide-react';

type PasswordData = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};

export default function ChangePasswordDialog({
  lng,
  handleUpdatePassword,
}: {
  lng: string;
  handleUpdatePassword: (passwordData: PasswordData) => Promise<void>;
}) {
  const { t } = useTranslation(lng, 'profile-page');

  const [open, setOpen] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setPasswordData({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
    setLoading(false);
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) reset();
      setOpen(newOpen);
    },
    [reset],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordData.currentPassword) {
      setError(t('password_empty_error'));
      return;
    }
    if (!passwordData.newPassword) {
      setError(t('password_empty_error'));
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setError(t('password_same_as_current'));
      return;
    }
    if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
      setError(t('password_match_error'));
      return;
    }

    setLoading(true);
    try {
      await handleUpdatePassword(passwordData);
      handleOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('incorrect') || msg.includes('not authorized') || msg.includes('401')) {
        setError(t('incorrect_password'));
      } else {
        setError(err instanceof Error ? err.message : t('password_empty_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordInput = (
    id: string,
    label: string,
    value: string,
    show: boolean,
    onToggle: () => void,
    onChange: (val: string) => void,
    autoComplete: string,
    dataTestId: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          className="pr-10"
          data-testid={dataTestId}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
          onClick={onToggle}
          tabIndex={-1}
          data-testid={`${dataTestId}-toggle`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        data-testid="change-password-trigger"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!loading}
          className="sm:max-w-md"
          onInteractOutside={loading ? (e) => e.preventDefault() : undefined}
          data-testid="change-password-dialog"
        >
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="change-password-form">
            <DialogHeader>
              <DialogTitle>{t('change_password')}</DialogTitle>
            </DialogHeader>

            {error && (
              <div
                className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive"
                data-testid="change-password-error"
              >
                {error}
              </div>
            )}

            {passwordInput(
              'current-password',
              t('current_password'),
              passwordData.currentPassword,
              showCurrent,
              () => setShowCurrent(!showCurrent),
              (val) => setPasswordData({ ...passwordData, currentPassword: val }),
              'current-password',
              'change-password-current',
            )}

            {passwordInput(
              'new-password',
              t('new_password'),
              passwordData.newPassword,
              showNew,
              () => setShowNew(!showNew),
              (val) => setPasswordData({ ...passwordData, newPassword: val }),
              'new-password',
              'change-password-new',
            )}

            {passwordInput(
              'new-password-confirm',
              t('new_password_confirm'),
              passwordData.newPasswordConfirm,
              showConfirm,
              () => setShowConfirm(!showConfirm),
              (val) => setPasswordData({ ...passwordData, newPasswordConfirm: val }),
              'new-password',
              'change-password-confirm',
            )}

            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                data-testid="change-password-cancel"
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading} data-testid="change-password-submit">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('update_password')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
