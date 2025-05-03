"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// MUI
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Styles
import "./team-settings-layout.css";

export default function TeamSettingsLayout({
  children,
  params: { lng, teamId },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
    teamId: string;
  };
}) {
  const { t } = useTranslation(lng, "teams-page");

  const pathname = usePathname();

  const links: { name: string; label: string; href: string }[] = [
    {
      name: "general",
      label: t("general"),
      href: `/${lng}/plan/teams/${teamId}/settings/general`,
    },
    {
      name: "members",
      label: t("members"),
      href: `/${lng}/plan/teams/${teamId}/settings/members`,
    },
  ];

  return (
    <div className="team-settings-layout">
      {/* Sidebar Menu */}
      <List
        dense={true}
        sx={{ width: "20%", maxWidth: 360, borderRight: "1px solid #e5e7eb" }}
      >
        {links.map((link) => (
          <ListItemButton
            key={link.name}
            selected={pathname.includes(link.name)}
            LinkComponent={Link}
            href={link.href}
          >
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>

      {/* Content Area */}
      <div className="team-settings-content">{children}</div>
    </div>
  );
}
