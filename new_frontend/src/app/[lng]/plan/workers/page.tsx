"use client";

import { useTeamStore } from "@/providers/team-store-provider";

export default function Page() {
  const selectedTeamId = useTeamStore((state) => state.selectedTeamId);
  const setSelectedTeamId = useTeamStore((state) => state.setSelectedTeamId);
  console.log("selectedTeamId", selectedTeamId);
  setSelectedTeamId("123");
  console.log("selectedTeamId", selectedTeamId);

  return <p>{`Workers Page ${selectedTeamId}`}</p>;
  // return <p>Workers Page</p>;
}
