"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
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
      name: "coverages",
      label: t("coverages"),
      href: `/${lng}/plan/coverages`,
      route: "/coverages",
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

  return (
    <div className="nav-links-container">
      {links.map((link) => {
        return (
          <div
            key={link.name}
            className={`nav-link-container ${
              pathname === link.href ? "active" : ""
            }`}
          >
            <Link className="nav-link-link" href={link.href}>
              <span
                className={`nav-link-label ${
                  pathname === link.href ? "active" : ""
                }`}
              >
                {link.label}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
