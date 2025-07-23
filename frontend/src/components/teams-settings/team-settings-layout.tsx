"use client";

import React from "react";
import { useTranslation } from "@/app/i18n/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
// MUI
import { Box, Tabs, Tab, Button } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "./team-settings-layout.css";

export default function TeamSettingsLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  const { t } = useTranslation(lng, "teams-page");
  const { selectedTeam } = useTeam();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Security: Only render if team is selected
  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No team selected</div>
      </div>
    );
  }

  // Extract current page from pathname
  const getCurrentPage = (): string => {
    if (pathname.includes("/general")) return "general";
    if (pathname.includes("/members")) return "members";
    return "general";
  };

  const currentPage = getCurrentPage();
  const teamId = selectedTeam.team.id;

  // Navigation handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    // Security: Validate page value
    const validPages = ["general", "members"];
    if (!validPages.includes(newValue)) {
      console.warn(`❌ Invalid page navigation attempted: ${newValue}`);
      return;
    }

    // Navigate to new page with current teamId
    const newUrl = `/${lng}/plan/teams/${newValue}?teamId=${teamId}`;
    router.push(newUrl);
  };

  // Back to teams selection
  const handleBackToTeams = () => {
    router.push(`/${lng}/plan/settings/teams`);
  };

  return (
    <div className="team-settings-layout min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBackToTeams}
            variant="outlined"
            size="small"
          >
            {t("back_to_teams") || "Back to Teams"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedTeam.team.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {t("team_settings_subtitle") ||
                "Manage team settings and members"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={currentPage}
              onChange={handleTabChange}
              aria-label="team settings tabs"
            >
              <Tab
                label={t("general") || "General"}
                value="general"
                id="team-tab-general"
                aria-controls="team-tabpanel-general"
              />
              <Tab
                label={t("members") || "Members"}
                value="members"
                id="team-tab-members"
                aria-controls="team-tabpanel-members"
              />
            </Tabs>
          </Box>
        </div>
      </div>

      {/* Content Area */}
      <div className="team-settings-content">{children}</div>
    </div>
  );
}
