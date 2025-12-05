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
  const { shouldRedirect } = useResponsiveSettings(lng);

  // Redirect to first child route based on device mode and orientation
  // - Mobile portrait: stay on this page (show nav list)
  // - Mobile landscape OR desktop: redirect to first child route
  React.useEffect(() => {
    if (shouldRedirect) {
      router.push(`/${lng}/plan/settings/personal-info`);
    }
  }, [shouldRedirect, lng, router]);

  // On mobile, SettingsLayout handles rendering the navigation list
  return null;
}
