"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
// Components
import VerifyEmail from "../../../../components/user-authentication/verify-email";
import ConsumeEmailVerification from "../../../../components/user-authentication/consume-email-verification";

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

  if (rid === "emailverification" && token !== null) {
    return <ConsumeEmailVerification lng={lng} />;
  } else {
    return <VerifyEmail lng={lng} />;
  }
}
