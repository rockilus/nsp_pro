"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
// Components
import ResetPassword from "../../../../components/user-authentication/reset-password";
import SendResetPassword from "../../../../components/user-authentication/send-reset-password";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const rid = searchParams.get("rid");
  const emailSent = searchParams.get("emailSent");

  if (rid === "emailpassword" && token !== null) {
    return <ResetPassword lng={lng} />;
  } else {
    return <SendResetPassword lng={lng} />;
  }
}
