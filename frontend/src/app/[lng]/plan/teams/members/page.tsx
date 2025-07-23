"use client";

import { useSearchParams } from "next/navigation";
// Components
import MembersTab from "@/components/teams-settings/members/members-tab";
// Styles
import "@/styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const searchParams = useSearchParams();

  // Extract teamId from query parameters
  const teamId = searchParams.get("teamId");

  // Security: Input validation
  if (!teamId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: Team ID is required</div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <MembersTab lng={lng} teamId={teamId} />
    </div>
  );
}
