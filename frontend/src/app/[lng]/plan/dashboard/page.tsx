"use client";

// Components
import DashboardTab from "../../../../components/dashboard/dashboard-tab";
import DashboardHOC from "../../../../components/dashboard/dashboard-hoc";
// Styles
import "../../../../styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const DashboardTabWithAuth = DashboardHOC(DashboardTab);

  return (
    <div className="page-layout">
      <DashboardTabWithAuth lng={lng} />
    </div>
  );
}
