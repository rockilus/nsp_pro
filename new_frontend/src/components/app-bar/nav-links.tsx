"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
// Components
// import TabButton from "@/app/components/app-bar/tab-button";

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
// const links = [
//   { name: "Home", href: "/dashboard", icon: HomeIcon },
//   {
//     name: "Invoices",
//     href: "/dashboard/invoices",
//     icon: DocumentDuplicateIcon,
//   },
//   { name: "Customers", href: "/dashboard/customers", icon: UserGroupIcon },
// ];

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
    <Box display="flex" justifyContent="center" alignItems="center">
      {links.map((link) => {
        return (
          <Link key={link.name} href={link.href}>
            <Button
              sx={{
                borderRadius: 4,
                textTransform: "none",
                border: pathname === link.href ? "1px solid" : "none",
                height: "30px",
                color: "grey.700",
              }}
            >
              {link.label}
            </Button>
          </Link>
        );
      })}
    </Box>
  );
}
