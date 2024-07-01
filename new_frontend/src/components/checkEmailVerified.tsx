"use client";

import Session from "supertokens-web-js/recipe/session";
import { EmailVerificationClaim } from "supertokens-web-js/recipe/emailverification";

export async function checkEmailVerified(): Promise<boolean> {
  if (await Session.doesSessionExist()) {
    let validationErrors = await Session.validateClaims();

    if (validationErrors.length === 0) {
      // user has verified their email address
      return true;
    } else {
      for (const err of validationErrors) {
        if (err.id === EmailVerificationClaim.id) {
          // email is not verified
          return false;
        }
      }
    }
  }
  // a session does not exist, or email is not verified
  return false;
}
