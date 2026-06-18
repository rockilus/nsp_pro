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

export default function SignUpPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params);
  const { t } = useTranslation(lng, 'auth-page');
  const router = useRouter();
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('passwords_do_not_match'));
      return;
    }
    if (password.length < 8) {
      setError(t('password_requirements'));
      return;
    }
    setLoading(true);
    try {
      await signUp({
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        confirm_password: confirmPassword,
      });
      router.push(`/${lng}/auth/otp?mode=signup&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || t('error_message'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="auth-signup-page">
      <CardHeader className="text-center">
        <CardTitle>{t('sign_up')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('first_name')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                data-testid="auth-firstname-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('last_name')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                data-testid="auth-lastname-input"
              />
            </div>
          </div>
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
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="auth-password-input"
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
          {error && (
            <p className="text-sm text-destructive" data-testid="auth-error-message">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="auth-signup-submit"
          >
            {loading ? '...' : t('sign_up')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href={`/${lng}/auth/signin`}
            className="hover:underline"
            data-testid="auth-signin-link"
          >
            {t('to_sign_in')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
