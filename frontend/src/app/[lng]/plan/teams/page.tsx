"use client";

import React from "react";

export default function TeamsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  // Redirect logic now handled in TeamSettingsLayout
  // This page only renders on mobile portrait to show the navigation list
  return null;
}
