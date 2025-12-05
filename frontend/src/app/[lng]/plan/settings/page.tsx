"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useResponsiveSettings } from "@/hooks/useResponsiveSettings";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  const router = useRouter();
  const { showNav } = useResponsiveSettings(lng);

  // On desktop (when showNav is false for parent route), redirect to first child route
  React.useEffect(() => {
    if (!showNav) {
      router.push(`/${lng}/plan/settings/personal-info`);
    }
  }, [showNav, lng, router]);

  // On mobile, SettingsLayout handles rendering the navigation list
  return null;
}
