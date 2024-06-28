"use client";

import React, { useEffect } from "react";
import { sendVerificationEmail } from "supertokens-web-js/recipe/emailverification";

async function sendEmail() {
  try {
    let response = await sendVerificationEmail();
    if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
      // This can happen if the info about email verification in the session was outdated.
      // Redirect the user to the home page
      // window.location.assign("/home");
      console.log("Email already verified");
    } else {
      // email was sent successfully.
      // window.alert("Please check your email and click the link in it");
      console.log("Email sent successfully");
    }
  } catch (err: any) {
    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you.
      // window.alert(err.message);
      console.log(err.message);
    } else {
      // window.alert("Oops! Something went wrong.");
      console.log("Oops! Something went wrong.");
      throw err;
    }
  }
}

export default function Page() {
  useEffect(() => {
    sendEmail();
  }, []);
  // sendEmail;
  return (
    <div>
      <div>This is the verify email page</div>
      <button onClick={sendEmail}>Send email</button>
    </div>
  );
}
