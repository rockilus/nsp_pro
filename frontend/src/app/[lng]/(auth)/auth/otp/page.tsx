'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthApi } from '@/app/lib/api/authApi';
import { retrieveSignupPassword } from '@/app/lib/signup-password-storage';

function OtpForm({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'auth-page');
  const router = useRouter();
  const params = useSearchParams();
  const { confirmSignUp, signIn } = useAuth();

  const mode = params.get('mode') || 'signup';
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setResent(false);
    try {
      await AuthApi.resendCode({ email });
      setResent(true);
    } catch (err: any) {
      setError(err.message || t('error_message'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      const savedPassword = retrieveSignupPassword();
      if (savedPassword) {
        await signIn(email, savedPassword);
        router.push(`/${lng}/plan/schedule`);
      } else {
        router.push(`/${lng}/auth/signin`);
      }
    } catch (err: any) {
      setError(err.message || t('error_message'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="auth-otp-page">
      <CardHeader className="text-center">
        <CardTitle>{t('enter_otp')}</CardTitle>
        <CardDescription data-testid="auth-otp-email">
          {t('otp_sent_to')} {email}
        </CardDescription>
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
          {error && (
            <p className="text-sm text-destructive" data-testid="auth-error-message">
              {error}
            </p>
          )}
          {resent && (
            <p
              className="text-sm text-green-600 dark:text-green-400"
              data-testid="auth-resent-message"
            >
              {t('send_email_success_message')}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading} data-testid="auth-otp-submit">
            {loading ? '...' : t('verify_email')}
          </Button>
          <button
            type="button"
            onClick={handleResend}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
            data-testid="auth-resend-code-button"
          >
            {t('resend_code')}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function OtpPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params);
  return (
    <Suspense>
      <OtpForm lng={lng} />
    </Suspense>
  );
}
