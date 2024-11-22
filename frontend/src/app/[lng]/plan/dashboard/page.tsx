"use client";

// Components
import DashboardTab from "../../../../components/dashboard/dashboard-tab";
import DashboardHOC from "../../../../components/dashboard/dashboard-hoc";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const DashboardTabWithAuth = DashboardHOC(DashboardTab);

  return <DashboardTabWithAuth lng={lng} />;
}
