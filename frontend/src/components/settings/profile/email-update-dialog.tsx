'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from '../../../app/i18n/client';
import { useApiClient } from '../../../app/lib/api-client';
import { AuthApi } from '../../../app/lib/api/authApi';
import { UserApi } from '../../../app/lib/api/userApi';
import { ApiError } from '../../../app/lib/api/baseApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Loader2 } from 'lucide-react';

type Step = 'sudo' | 'new-email' | 'verify-otp' | 'success';

interface EmailUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  lng: string;
  onEmailUpdated: (newEmail: string) => void;
}

export default function EmailUpdateDialog({
  open,
  onOpenChange,
  currentEmail,
  lng,
  onEmailUpdated,
}: EmailUpdateDialogProps) {
  const { t } = useTranslation(lng, 'profile-page');
  const apiClient = useApiClient();

  const [step, setStep] = useState<Step>('sudo');
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep('sudo');
    setPassword('');
    setNewEmail('');
    setCode('');
    setError(null);
    setLoading(false);
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) reset();
      onOpenChange(newOpen);
    },
    [onOpenChange, reset],
  );

  const handleError = useCallback(
    (err: unknown, fallbackKey: string) => {
      if (err instanceof ApiError && err.errorCode) {
        const map: Record<string, string> = {
          invalid_verification_code: t('invalid_verification_code'),
          expired_verification_code: t('expired_verification_code'),
        };
        setError(map[err.errorCode] || err.message);
      } else if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('incorrect credentials') || msg.includes('401')) {
          setError(t('incorrect_password'));
        } else if (msg.includes('409') || msg.includes('already')) {
          setError(t('email_in_use'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t(fallbackKey));
      }
    },
    [t],
  );

  // Step 1: Sudo prompt — verify current password
  const handleSudoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(t('password_empty_error'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await AuthApi.signIn({ email: currentEmail, password });
      setStep('new-email');
    } catch (err) {
      handleError(err, 'incorrect_password');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Initiate email change
  const handleNewEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      setError(t('new_email_placeholder'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await AuthApi.changeEmail({ new_email: newEmail });
      setStep('verify-otp');
    } catch (err) {
      handleError(err, 'email_in_use');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      await UserApi.verifyEmailSync(apiClient, { code });
      await AuthApi.refresh();
      const updatedUser = await UserApi.getCurrentUser(apiClient);
      onEmailUpdated(updatedUser.email);
      setStep('success');
      setTimeout(() => handleOpenChange(false), 2000);
    } catch (err) {
      handleError(err, 'invalid_verification_code');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Resend code
  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await AuthApi.changeEmail({ new_email: newEmail });
      setCode('');
    } catch (err) {
      handleError(err, 'email_in_use');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'sudo':
        return (
          <form onSubmit={handleSudoSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('verify_identity')}</DialogTitle>
              <DialogDescription>
                {t('enter_password_to_continue')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="sudo-password">{t('current_password')}</Label>
              <Input
                id="sudo-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('current_password_placeholder')}
                disabled={loading}
                autoFocus
              />
            </div>
            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading || !password}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('verify')}
              </Button>
            </DialogFooter>
          </form>
        );

      case 'new-email':
        return (
          <form onSubmit={handleNewEmailSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('change_email')}</DialogTitle>
              <DialogDescription>
                {t('verification_code_sent')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-email-input">{t('new_email')}</Label>
              <Input
                id="new-email-input"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('new_email_placeholder')}
                disabled={loading}
                autoFocus
              />
            </div>
            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading || !newEmail}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('send_verification_code')}
              </Button>
            </DialogFooter>
          </form>
        );

      case 'verify-otp':
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('enter_verification_code')}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {newEmail}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter showCloseButton={false}>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={loading}
              >
                {t('resend')}
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('verify')}
              </Button>
            </DialogFooter>
          </form>
        );

      case 'success':
        return (
          <div className="space-y-4 py-4 text-center">
            <DialogHeader>
              <DialogTitle>{t('email_updated')}</DialogTitle>
            </DialogHeader>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={step !== 'success'}
        className="sm:max-w-md"
        onInteractOutside={step === 'success' ? undefined : (e) => e.preventDefault()}
      >
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}
