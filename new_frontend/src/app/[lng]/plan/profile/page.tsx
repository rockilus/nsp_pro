"use client";

// Components
import UserProfileTab from "../../../../components/user-profile/user-profile-tab";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  return <UserProfileTab lng={lng} />;
}
