"use client";

// Components
import TeamsTab from "../../../../../components/teams/teams-tab";
// Styles
import "../../../../../styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  return (
    <div className="page-layout">
      <TeamsTab lng={lng} />
    </div>
  );
}
