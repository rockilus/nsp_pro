"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// Styles
import "./nav-links.css";
// Types
import { TeamMembershipRole } from "@/types/team";

export default function NavLinks({
  lng,
  userTeamRole,
}: {
  lng: string;
  userTeamRole: TeamMembershipRole | null;
}) {
  const { t } = useTranslation(lng, "app-bar");

  const pathname = usePathname();

  const allLinks: { name: string; label: string; href: string }[] = [
    { name: "workers", label: t("workers"), href: `/${lng}/plan/workers` },
    { name: "shifts", label: t("shifts"), href: `/${lng}/plan/shifts` },
    {
      name: "coverages",
      label: t("coverages"),
      href: `/${lng}/plan/coverages`,
    },
    {
      name: "constraints",
      label: t("constraints"),
      href: `/${lng}/plan/constraints`,
    },
    { name: "requests", label: t("requests"), href: `/${lng}/plan/requests` },
    { name: "campaign", label: t("campaign"), href: `/${lng}/plan/campaign` },
    { name: "schedule", label: t("schedule"), href: `/${lng}/plan/schedule` },
    { name: "stats", label: t("stats"), href: `/${lng}/plan/stats` },
  ];

  const links =
    userTeamRole === null
      ? []
      : userTeamRole === TeamMembershipRole.OWNER
      ? allLinks
      : allLinks.filter((link) => ["requests", "schedule"].includes(link.name));

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
