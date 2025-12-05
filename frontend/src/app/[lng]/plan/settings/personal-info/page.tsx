"use client";

import React from "react";
// Components
import UserProfileTab from "../../../../../components/settings/profile/user-profile-tab";
// Styles
import "../../../../../styles/page.css";

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  return (
    <div className="page-layout">
      <UserProfileTab lng={lng} />
    </div>
  );
}
