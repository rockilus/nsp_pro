"use client";

import React from "react";
// Components
import SwapTab from "../../../../components/swaps/SwapTab";
import { AccessGuard } from "@/components/access/access-guard";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";

export default function SwapsPage() {
  const { selectedTeam } = useTeam();
  const { user } = useUser();

  return (
    selectedTeam &&
    user && (
      <AccessGuard route="/swaps" teamWithMembership={selectedTeam}>
        <SwapTab teamWithMembership={selectedTeam} currentUserId={user.id} />
      </AccessGuard>
    )
  );
}
