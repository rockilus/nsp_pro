"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
// MUI
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { ArrowBack } from "@mui/icons-material";
// Context
import { useTeam } from "@/context/TeamContext";
// Hooks
import { useResponsiveSettings } from "@/hooks/useResponsiveSettings";
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
  const { isMobile, showNav, showContent } = useResponsiveSettings(lng);

  // Security: Only render if team is selected
  if (!selectedTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No team selected</div>
      </div>
    );
  }

  const teamId = selectedTeam.team.id;

  // Back to teams selection
  const handleBackToTeams = () => {
    router.push(`/${lng}/plan/settings/teams`);
  };

  // Navigation links for team settings
  const teamLinks: { name: string; label: string; href: string }[] = [
    {
      name: "general",
      label: t("general") || "General",
      href: `/${lng}/plan/teams/general?teamId=${teamId}`,
    },
    {
      name: "members",
      label: t("members") || "Members",
      href: `/${lng}/plan/teams/members?teamId=${teamId}`,
    },
  ];

  return (
    <div className="team-settings-layout">
      {/* Mobile Back Button */}
      {isMobile && showContent && (
        <div className="mobile-back-button">
          <IconButton onClick={handleBackToTeams} aria-label={t("back")}>
            <ArrowBack />
          </IconButton>
          <span className="mobile-back-title">{selectedTeam.team.name}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      {showNav && (
        <div className="team-settings-sidebar">
          {/* Team Header */}
          <div className="team-settings-header">
            <h1 className="team-settings-title">{selectedTeam.team.name}</h1>
          </div>

          {/* Back Button */}
          <div className="team-settings-back-section">
            <Button
              startIcon={<ArrowBack />}
              onClick={handleBackToTeams}
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
              }}
            >
              {t("back_to_teams") || "Back to Teams"}
            </Button>
          </div>

          {/* Navigation List */}
          <List dense={true}>
            {teamLinks.map((link) => (
              <ListItem key={link.name} disablePadding>
                <ListItemButton
                  selected={pathname.includes(link.name)}
                  LinkComponent={Link}
                  href={link.href}
                >
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </div>
      )}

      {/* Content Area */}
      {showContent && <div className="team-settings-content">{children}</div>}
    </div>
  );
}
