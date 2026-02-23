"use client";

/**
 * Root Silent Renew Page — /silent-renew/
 *
 * oidc-client-ts loads this URL in a hidden <iframe> to perform automatic
 * token renewal. The page calls signinSilentCallback() which reads the new
 * tokens from the iframe URL and posts them back to the parent frame.
 *
 * URL must match `silent_redirect_uri` in cognitoAuthConfig exactly
 * (resolved: https://app.rockilus.com/silent-renew/) AND must be registered
 * in the Cognito App Client callback_urls list.
 *
 * The page is intentionally blank — users never land here directly.
 */

import { useEffect } from "react";
import { UserManager } from "oidc-client-ts";
import { cognitoAuthConfig } from "../../config/cognito";

export default function SilentRenewPage() {
  useEffect(() => {
    const manager = new UserManager(cognitoAuthConfig as any);
    manager.signinSilentCallback().catch((err) => {
      console.error("Silent renew callback error:", err);
    });
  }, []);

  // Render nothing — this page is only ever loaded in a hidden iframe.
  return null;
}
