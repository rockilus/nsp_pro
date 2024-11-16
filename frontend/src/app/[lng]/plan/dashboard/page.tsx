"use client";

// Components
import DashboardTab from "../../../../components/dashboard/dashboard-tab";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  return <DashboardTab lng={lng} />;
}
