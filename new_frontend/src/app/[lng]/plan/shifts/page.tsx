"use client";

import { useTeamStore } from "@/providers/team-store-provider";

export default function Page() {
  const selectedTeamId = useTeamStore((state) => state.selectedTeamId);
  return <p>{`Shifts Page ${selectedTeamId}`}</p>;
}
