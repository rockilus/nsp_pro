"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// MUI
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Styles
import "./nav-links.css";
// Types
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";
import { canAccessPage } from "@/app/lib/access-control/check-access";

export default function NavLinks({
  lng,
  selectedTeam,
}: {
  lng: string;
  selectedTeam: TeamWithMembership | null;
}) {
  const { t } = useTranslation(lng, "app-bar");

  const pathname = usePathname();

  const allLinks: {
    name: string;
    label: string;
    href: string;
    route: string;
  }[] = [
    {
      name: "workers",
      label: t("workers"),
      href: `/${lng}/plan/workers`,
      route: "/workers",
    },
    {
      name: "shifts",
      label: t("shifts"),
      href: `/${lng}/plan/shifts`,
      route: "/shifts",
    },
    {
      name: "shift-demands",
      label: t("shift_demands"),
      href: `/${lng}/plan/shift-demands`,
      route: "/shift-demands",
    },
    {
      name: "constraints",
      label: t("constraints"),
      href: `/${lng}/plan/constraints`,
      route: "/constraints",
    },
    {
      name: "requests",
      label: t("requests"),
      href: `/${lng}/plan/requests`,
      route: "/requests",
    },
    {
      name: "campaign",
      label: t("campaign"),
      href: `/${lng}/plan/campaign`,
      route: "/campaign",
    },
    {
      name: "schedule",
      label: t("schedule"),
      href: `/${lng}/plan/schedule`,
      route: "/schedule",
    },
    {
      name: "swaps",
      label: t("swaps"),
      href: `/${lng}/plan/swaps`,
      route: "/swaps",
    },
    {
      name: "stats",
      label: t("stats"),
      href: `/${lng}/plan/stats`,
      route: "/stats",
    },
  ];

  const links = allLinks.filter((link) => {
    if (!link.route) return true; // no restriction
    if (!selectedTeam) return false; // no team selected
    return canAccessPage(link.route, selectedTeam);
  });

  // Determine active tab by matching pathname with the link href pattern
  const activeRoute =
    links.find((l) => pathname?.startsWith(`/${lng}/plan${l.route}`))?.route ??
    false;

  return (
    <div className="nav-links-container">
      <Tabs
        value={activeRoute}
        aria-label="main navigation tabs"
        textColor="primary"
        indicatorColor="primary"
        variant="standard"
        sx={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          // make the indicator (underline) thicker
          "& .MuiTabs-indicator": {
            height: "4px",
            // borderRadius: 2,
          },
        }}
      >
        {links.map((link) => (
          <Tab
            key={link.name}
            value={link.route}
            label={link.label}
            component={Link}
            href={link.href}
            data-testid={`nav-link-${link.name}`}
            className="nav-link-link"
            disableRipple
            sx={{
              textTransform: "none",
              padding: "0 10px",
              minWidth: "auto",
              minHeight: 64,
              display: "flex",
              alignItems: "center",
            }}
          />
        ))}
      </Tabs>
    </div>
  );
}

export function NavLinksMobile({
  lng,
  selectedTeam,
  onClick,
}: {
  lng: string;
  selectedTeam: TeamWithMembership | null;
  onClick?: () => void;
}) {
  const { t } = useTranslation(lng, "app-bar");
  const pathname = usePathname();

  const allLinks: {
    name: string;
    label: string;
    href: string;
    route: string;
  }[] = [
    {
      name: "workers",
      label: t("workers"),
      href: `/${lng}/plan/workers`,
      route: "/workers",
    },
    {
      name: "shifts",
      label: t("shifts"),
      href: `/${lng}/plan/shifts`,
      route: "/shifts",
    },
    {
      name: "shift-demands",
      label: t("shift_demands"),
      href: `/${lng}/plan/shift-demands`,
      route: "/shift-demands",
    },
    {
      name: "constraints",
      label: t("constraints"),
      href: `/${lng}/plan/constraints`,
      route: "/constraints",
    },
    {
      name: "requests",
      label: t("requests"),
      href: `/${lng}/plan/requests`,
      route: "/requests",
    },
    {
      name: "campaign",
      label: t("campaign"),
      href: `/${lng}/plan/campaign`,
      route: "/campaign",
    },
    {
      name: "schedule",
      label: t("schedule"),
      href: `/${lng}/plan/schedule`,
      route: "/schedule",
    },
    {
      name: "swaps",
      label: t("swaps"),
      href: `/${lng}/plan/swaps`,
      route: "/swaps",
    },
    {
      name: "stats",
      label: t("stats"),
      href: `/${lng}/plan/stats`,
      route: "/stats",
    },
  ];

  const links = allLinks.filter((link) => {
    if (!link.route) return true;
    if (!selectedTeam) return false;
    return canAccessPage(link.route, selectedTeam);
  });

  return (
    <List>
      {links.map((link) => (
        <ListItem key={link.name} disablePadding>
          <ListItemButton component={Link} href={link.href} onClick={onClick}>
            <ListItemText primary={link.label} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
