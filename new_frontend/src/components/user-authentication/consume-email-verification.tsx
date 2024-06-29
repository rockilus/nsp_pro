"use client";

import React, { useState, useEffect } from "react";
import { verifyEmail } from "supertokens-web-js/recipe/emailverification";
import Session from "supertokens-web-js/recipe/session";

async function doesSessionExist() {
  if (await Session.doesSessionExist()) {
    // user is logged in
    return true;
  } else {
    // user has not logged in yet
    return false;
  }
}

async function consumeVerificationCode() {
  try {
    let response = await verifyEmail();
    if (response.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
      // This can happen if the verification code is expired or invalid.
      // You should ask the user to retry
      console.log("Email verification code expired");
      window.alert(
        "Oops! Seems like the verification link expired. Please try again"
      );
      window.location.assign("/auth/verify-email"); // back to the email sending screen.
    } else {
      // email was verified successfully.
      // window.location.assign("/home");
      console.log("Email verified successfully");
      window.alert("Email verified successfully");
      window.location.assign("/en/plan/workers"); // back to the email sending screen.
    }
  } catch (err: any) {
    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you.
      // window.alert(err.message);
      console.log(err.message);
    } else {
      // window.alert("Oops! Something went wrong.");
      console.log("Oops! Something went wrong.");
    }
  }
}

export default function ConsumeEmailVerification() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSession, setIsSession] = useState(false);

  useEffect(() => {
    const consumeEmailEffect = async () => {
      console.log("about to check session");
      const hasSession = await doesSessionExist();
      setIsSession(hasSession);
      if (hasSession) {
        console.log("about to consume verification code");
        await consumeVerificationCode();
      }
      setIsLoading(false);
    };
    consumeEmailEffect();
  }, []);

  return isLoading ? (
    <div>
      <div>Loading...</div>
    </div>
  ) : isSession ? (
    <div>
      <p>Verifying email...</p>
      {/* <button onClick={handleConsumeVerificationEmail}>Consume email</button> */}
    </div>
  ) : (
    <div>
      <p>Click here to verify your email</p>
      <button onClick={consumeVerificationCode}>Consume email</button>
    </div>
  );
}
