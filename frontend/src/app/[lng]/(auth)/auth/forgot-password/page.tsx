'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ForgotPasswordPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params);
  const { t } = useTranslation(lng, 'auth-page');
  const router = useRouter();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      router.push(`/${lng}/auth/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || t('error_message'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="auth-forgot-password-page">
      <CardHeader className="pb-2 text-center">
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rockilus_logo_blue.jpg" alt="Rockilus" className="h-10 w-auto dark:hidden" />
        </div>
        <CardTitle>{t('forgot_password')}</CardTitle>
        <CardDescription>{t('reset_password_send_link_message')}</CardDescription>
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
          {error && (
            <p className="text-sm text-destructive" data-testid="auth-error-message">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="auth-forgot-password-submit"
          >
            {loading ? '...' : t('send_reset_link')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href={`/${lng}/auth/signin`}
            className="hover:underline"
            data-testid="auth-back-to-signin-link"
          >
            {t('back_to_sign_in')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
