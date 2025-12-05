"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// MUI
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
// Styles
import "../../../../styles/page.css";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  const { t } = useTranslation(lng, "profile-page");
  const { t: tAppBar } = useTranslation(lng, "app-bar");
  const router = useRouter();

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

  // On desktop, redirect to first child route
  React.useEffect(() => {
    const checkViewport = () => {
      if (window.innerWidth > 768) {
        router.push(`/${lng}/plan/settings/personal-info`);
      }
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, [lng, router]);

  return (
    <div className="page-layout">
      <div className="mobile-settings-list">
        <h1 className="mobile-settings-title">{tAppBar("settings")}</h1>
        <List>
          {links.map((link) => (
            <ListItemButton
              key={link.name}
              onClick={() => router.push(link.href)}
              sx={{
                borderBottom: "1px solid #e5e7eb",
                py: 2,
              }}
            >
              <ListItemText primary={link.label} />
              <ChevronRightIcon sx={{ color: "#9ca3af" }} />
            </ListItemButton>
          ))}
        </List>
      </div>
    </div>
  );
}
