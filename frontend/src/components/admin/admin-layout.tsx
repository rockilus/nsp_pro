"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
// MUI
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
// Links config
import { getAdminLinks } from "./admin-links";
// Styles
import "./admin-layout.css";

export default function AdminLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: { lng: string };
}) {
  const pathname = usePathname();
  const links = getAdminLinks(lng);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <List
        dense
        component="nav"
        className="admin-sidebar"
        data-testid="admin-sidebar"
      >
        <p className="admin-sidebar-title">Admin</p>
        {links.map((link) => (
          <ListItemButton
            key={link.name}
            data-testid={`admin-sidebar-link-${link.name}`}
            selected={pathname.includes(link.name)}
            LinkComponent={Link}
            href={link.href}
          >
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>

      {/* Main content */}
      <div className="admin-content">{children}</div>
    </div>
  );
}
