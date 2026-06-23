'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import { AuthApi } from '@/app/lib/api/authApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function SignInPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params);
  const { t } = useTranslation(lng, 'auth-page');
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setUnconfirmed(false);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push(`/${lng}/plan/schedule`);
    } catch (err: any) {
      if (err.errorCode === 'USER_NOT_CONFIRMED') {
        setUnconfirmed(true);
      } else {
        setError(err.message || t('error_message'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setLoading(true);
    try {
      await AuthApi.resendCode({ email });
      setResent(true);
      setTimeout(() => {
        router.push(`/${lng}/auth/otp?mode=signin&email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || t('error_message'));
    } finally {
      setLoading(false);
    }
  }

  if (unconfirmed) {
    return (
      <Card className="w-full max-w-md" data-testid="auth-signin-page">
        <CardHeader className="pb-2 text-center">
          <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rockilus_logo_blue.jpg"
            alt="Rockilus"
            className="h-10 w-auto dark:hidden"
          />
          </div>
          <CardTitle>{t('account_not_confirmed')}</CardTitle>
          <CardDescription>{t('account_not_confirmed_resend')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              {t('code_resent_redirecting')}
            </p>
          )}
          <Button
            onClick={handleResend}
            disabled={loading}
            className="w-full"
            data-testid="auth-resend-code-button"
          >
            {loading ? '...' : t('resend_code')}
          </Button>
          <button
            type="button"
            onClick={() =>
              router.push(`/${lng}/auth/otp?mode=signin&email=${encodeURIComponent(email)}`)
            }
            className="w-full text-center text-sm text-muted-foreground hover:underline"
            data-testid="auth-unconfirmed-already-have-code"
          >
            {t('didnt_receive_code')}
          </button>
          <button
            type="button"
            onClick={() => setUnconfirmed(false)}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
            data-testid="auth-unconfirmed-back-button"
          >
            {t('back_to_sign_in')}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" data-testid="auth-signin-page">
      <CardHeader className="pb-2 text-center">
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rockilus_logo_blue.jpg" alt="Rockilus" className="h-10 w-auto dark:hidden" />
        </div>
        <CardTitle>{t('sign_in')}</CardTitle>
        <CardDescription>{t('email_address')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email_address')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="auth-email-input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('password')}</Label>
              <Link
                href={`/${lng}/auth/forgot-password`}
                className="text-sm text-muted-foreground hover:underline"
                data-testid="auth-forgot-password-link"
              >
                {t('forgot_password')}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
                data-testid="auth-password-input"
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
            data-testid="auth-signin-submit"
          >
            {loading ? '...' : t('sign_in')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href={`/${lng}/auth/signup`}
            className="hover:underline"
            data-testid="auth-signup-link"
          >
            {t('to_sign_up')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
