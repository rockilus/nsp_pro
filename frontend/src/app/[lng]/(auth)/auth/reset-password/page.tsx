'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      <CardHeader className="pb-2 text-center">
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rockilus_logo_blue.jpg" alt="Rockilus" className="h-10 w-auto dark:hidden" />
        </div>
        <CardTitle>{t('reset_password')}</CardTitle>
        <CardDescription>{t('reset_password_message')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{t('enter_otp')}</Label>
            <div className="flex justify-center" data-testid="auth-otp-input">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading} autoFocus>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('new_password')}</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
                data-testid="auth-new-password-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('password_requirements')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
                data-testid="auth-confirm-password-input"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="auth-error-message">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="auth-reset-password-submit"
          >
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
