"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// MUI
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// Hooks
import { useResponsiveSettings } from "@/hooks/useResponsiveSettings";
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
  const router = useRouter();
  const { isMobile, showNav, showContent } = useResponsiveSettings(lng);

  // Back button handler for mobile
  const handleBack = () => {
    router.push(`/${lng}/plan/settings`);
  };

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
      {/* Mobile Back Button */}
      {isMobile && showContent && (
        <div className="mobile-back-button">
          <IconButton onClick={handleBack} aria-label={t("back")}>
            <ArrowBackIcon />
          </IconButton>
          <span className="mobile-back-title">{tAppBar("settings")}</span>
        </div>
      )}

      {/* Sidebar Menu */}
      {showNav && (
        <List
          dense={true}
          sx={{ width: "20%", maxWidth: 360, borderRight: "1px solid #e5e7eb" }}
          className="settings-sidebar"
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
      )}

      {/* Content Area */}
      {showContent && <div className="settings-content">{children}</div>}
    </div>
  );
}
