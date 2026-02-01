"use client";

import React from "react";
import { useParams } from "next/navigation";
// Components
import SwapTab from "../../../../components/swaps/SwapTab";
import { AccessGuard } from "@/components/access/access-guard";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";

export default function SwapsPage() {
  const params = useParams();
  const lng = (params as any)?.lng || "en";
  const { selectedTeam } = useTeam();
  const { user } = useUser();

  return (
    selectedTeam &&
    user && (
      <AccessGuard route="/swaps" teamWithMembership={selectedTeam}>
        <SwapTab
          teamWithMembership={selectedTeam}
          currentUserId={user.id}
          lng={lng}
        />
      </AccessGuard>
    )
  );
}
