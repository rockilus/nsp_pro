"use client";

import React from "react";
import SecurityTab from "@/components/settings/security/security-tab";

export default function SecurityPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  return <SecurityTab lng={lng} />;
}
