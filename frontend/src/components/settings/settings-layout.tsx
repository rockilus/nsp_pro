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
import "./settings-layout.css";

export default function SettingsLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  const { t } = useTranslation(lng, "profile-page");
  const { t: tAppBar } = useTranslation(lng, "app-bar");

  const pathname = usePathname();

  const links: { name: string; label: string; href: string }[] = [
    {
      name: "personal-info",
      label: t("personal_info"),
      href: `/${lng}/plan/settings/personal-info`,
    },
    {
      name: "security",
      label: t("security_and_sign_in"),
      href: `/${lng}/plan/settings/security`,
    },
    {
      name: "teams",
      label: tAppBar("teams"),
      href: `/${lng}/plan/settings/teams`,
    },
  ];

  return (
    <div className="settings-layout">
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
      <div className="settings-content">{children}</div>
    </div>
  );
}
