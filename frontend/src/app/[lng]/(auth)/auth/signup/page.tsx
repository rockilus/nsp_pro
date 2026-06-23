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
import { storeSignupPassword } from '@/app/lib/signup-password-storage';
import { Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError(t('invalid_email'));
      return;
    }
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
      storeSignupPassword(password);
      router.push(`/${lng}/auth/otp?mode=signup&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || t('error_message'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="auth-signup-page">
      <CardHeader className="pb-2 text-center">
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rockilus_logo_blue.jpg"
            alt="Rockilus"
            className="h-10 w-auto dark:hidden"
          />
        </div>
        <CardTitle>{t('sign_up')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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
