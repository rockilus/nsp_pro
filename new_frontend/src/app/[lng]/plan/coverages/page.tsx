"use client";

import { useEffect } from "react";
// Stores
import { useTeamStore } from "../../../../providers/team-store-provider";
// Actions
import { getSelectedTeamId } from "../../../lib/team";
// Components
import CoverageTab from "../../../../components/coverages/coverage-tab";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const selectedTeamId = useTeamStore((state) => state.selectedTeamId);
  const setSelectedTeamId = useTeamStore((state) => state.setSelectedTeamId);

  useEffect(() => {
    const fetchTeamId = async () => {
      if (!selectedTeamId) {
        const teamId = await getSelectedTeamId();
        setSelectedTeamId(teamId);
      }
    };

    fetchTeamId();
  }, [selectedTeamId, setSelectedTeamId]);

  return <CoverageTab lng={lng} selectedTeamId={selectedTeamId} />;
}
