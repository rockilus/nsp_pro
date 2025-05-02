"use client";

// Components
import CoverageTab from "../../../../components/coverages/coverage-tab";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const { selectedTeam } = useTeam();

  return (
    <div className="page-layout">
      <CoverageTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
    </div>
  );
}
