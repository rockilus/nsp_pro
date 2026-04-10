'use client';

/**
 * Silent Renew Page
 *
 * This page is loaded inside a hidden iframe by oidc-client-ts during
 * automatic token renewal. It must call `signinSilentCallback()` so the
 * library can extract the new tokens from the URL and pass them back to
 * the parent frame.
 *
 * The page is intentionally blank — users never see it directly.
 * It is referenced by `silent_redirect_uri` in cognitoAuthConfig.
 */

import { useEffect } from 'react';
import { UserManager } from 'oidc-client-ts';
import { cognitoAuthConfig } from '../../../../config/cognito';

export default function SilentRenewPage() {
  useEffect(() => {
    const manager = new UserManager(cognitoAuthConfig as any);
    manager.signinSilentCallback().catch((err) => {
      console.error('Silent renew callback error:', err);
    });
  }, []);

  // Render nothing — this page is only ever loaded in a hidden iframe.
  return null;
}
