"use client";

import { useEffect } from "react";
// Stores
import { useTeamStore } from "@/providers/team-store-provider";
// Actions
import { getSelectedTeamId } from "@/app/lib/team";
// Components
import WorkerTab from "@/components/workers/worker-tab";

export default function Page() {
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

  // return <p>{`Workers Page ${selectedTeamId}`}</p>;
  return <WorkerTab selectedTeamId={selectedTeamId} />;
}
