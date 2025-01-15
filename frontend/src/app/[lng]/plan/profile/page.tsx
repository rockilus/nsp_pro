"use client";

// Components
import UserProfileTab from "../../../../components/user-profile/user-profile-tab";
// Styles
import "../../../../styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  return (
    <div className="page-layout">
      <UserProfileTab lng={lng} />
    </div>
  );
}
