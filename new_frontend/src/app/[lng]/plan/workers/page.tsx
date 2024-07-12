"use client";

import { useEffect } from "react";
// Stores
import { useTeamStore } from "../../../../providers/team-store-provider";
// Actions
import { getSelectedTeamId } from "../../../lib/team";
// Components
import WorkerTab from "../../../../components/workers/worker-tab";

import TablesSkeleton from "../../../../components/skeletons/tables-skeleton";
import AgendasSkeleton from "../../../../components/skeletons/agendas-skeleton";

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

  // return <WorkerTab lng={lng} selectedTeamId={selectedTeamId} />;
  return <AgendasSkeleton />;
}
