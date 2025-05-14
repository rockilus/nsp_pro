"use client";

// import React, { useState, useEffect } from "react";
// import { SessionAuth } from "supertokens-auth-react/recipe/session";

// type Props = Parameters<typeof SessionAuth>[0] & {
//   children?: React.ReactNode | undefined;
// };

// export const SessionAuthForNextJS = (props: Props) => {
//   console.log("SessionAuthForNextJS running...");

//   const [loaded, setLoaded] = useState(false);
//   useEffect(() => {
//     setLoaded(true);
//   }, []);
//   if (!loaded) {
//     return props.children;
//   }
//   return <SessionAuth {...props}>{props.children}</SessionAuth>;
// };

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import Session from "supertokens-web-js/recipe/session";
import { EmailVerificationClaim } from "supertokens-web-js/recipe/emailverification";

type Props = Parameters<typeof SessionAuth>[0] & {
  children?: React.ReactNode | undefined;
};

export async function shouldLoadRoute(): Promise<boolean> {
  console.log("shouldLoadRoute running...");

  if (await Session.doesSessionExist()) {
    let validationErrors = await Session.validateClaims();

    if (validationErrors.length === 0) {
      console.log("Session exists and email is verified");

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

export const SessionAuthForNextJS = (props: Props) => {
  console.log("SessionAuthForNextJS running...");

  const [loaded, setLoaded] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true); // Assume true initially
  const router = useRouter();

  useEffect(() => {
    const checkEmailVerification = async () => {
      try {
        const status = await shouldLoadRoute(); // Fetch email verification status
        setIsEmailVerified(status);
        setLoaded(true);
      } catch (error) {
        console.error("Error fetching email verification status:", error);
        // Handle error, maybe redirect to an error page
      }
    };

    checkEmailVerification();
  }, []);

  // Redirect to verify email page if loaded and email is not verified
  useEffect(() => {
    if (loaded && !isEmailVerified) {
      console.log("Redirecting to /auth/verify-email");

      router.push("/auth/verify-email"); // Adjust the path as needed
    }
  }, [loaded, isEmailVerified, router]);

  if (!loaded) {
    return <div>Loading...</div>; // Or any other loading indicator
  }

  return <SessionAuth {...props}>{props.children}</SessionAuth>;
};
