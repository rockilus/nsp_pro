"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// Styles
import "./nav-links.css";

export default function NavLinks({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "app-bar");

  const pathname = usePathname();

  const links: { name: string; label: string; href: string }[] = [
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

  return (
    <div className="nav-links-container">
      {links.map((link) => {
        return (
          <div
            className={`nav-link-container ${
              pathname === link.href ? "active" : ""
            }`}
          >
            <Link className="nav-link-link" key={link.name} href={link.href}>
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
