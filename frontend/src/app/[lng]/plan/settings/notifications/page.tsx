"use client";

import React from "react";
import NotificationSettingsTab from "@/components/settings/notifications/notification-settings-tab";
import "@/styles/page.css";

export default function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  return (
    <div className="page-layout">
      <NotificationSettingsTab lng={lng} />
    </div>
  );
}
