'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetForm({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'auth-page');
  const router = useRouter();
  const params = useSearchParams();
  const { confirmForgotPassword } = useAuth();

  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('passwords_do_not_match'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('password_requirements'));
      return;
    }
    setLoading(true);
    try {
      await confirmForgotPassword(email, code, newPassword);
      router.push(`/${lng}/auth/signin`);
    } catch (err: any) {
      setError(err.message || t('error_message'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="auth-reset-password-page">
      <CardHeader className="text-center">
        <CardTitle>{t('reset_password')}</CardTitle>
        <CardDescription>{t('reset_password_message')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{t('enter_otp')}</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              className="text-center text-lg tracking-[0.25em]"
              data-testid="auth-otp-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('new_password')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="auth-new-password-input"
            />
            <p className="text-xs text-muted-foreground">{t('password_requirements')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="auth-confirm-password-input"
            />
          </div>
          {error && <p className="text-sm text-destructive" data-testid="auth-error-message">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="auth-reset-password-submit">
            {loading ? '...' : t('reset_password')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params);
  return (
    <Suspense>
      <ResetForm lng={lng} />
    </Suspense>
  );
}
