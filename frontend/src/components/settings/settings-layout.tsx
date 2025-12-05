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
import { useIsMobile, useIsLandscape } from "@/hooks/useIsMobile";
// Components
import NavigationHeader from "@/components/common/navigation-header";
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
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const { showNav, showContent } = useResponsiveSettings(lng);

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
      {/* Sidebar Menu */}
      {showNav && (
        <>
          {isMobile && !isLandscape && (
            <div style={{ paddingLeft: "16px" }}>
              <NavigationHeader title={t("settings")} showBackButton={false} />
            </div>
          )}
          <List
            dense={true}
            sx={{
              width: isMobile && !isLandscape ? "100%" : "20%",
              maxWidth: isMobile && !isLandscape ? "none" : 360,
            }}
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
        </>
      )}

      {/* Content Area */}
      {showContent && <div className="settings-content">{children}</div>}
    </div>
  );
}
