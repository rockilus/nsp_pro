"use client";

import * as React from "react";
import SessionReact from "supertokens-auth-react/recipe/session";
import SuperTokensReact from "supertokens-auth-react";
import { useTranslation } from "@/app/i18n/client";
import Link from "next/link";
// MUI
import AccountCircle from "@mui/icons-material/AccountCircle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export default function AccountMenu({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "app-bar");

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const links: { name: string; label: string; href: string }[] = [
    {
      name: "profile",
      label: t("profile"),
      href: `/${lng}/plan/settings/profile`,
    },
    {
      name: "teams",
      label: t("teams"),
      href: `/${lng}/plan/settings/teams`,
    },
  ];

  const handleLogout = async () => {
    await SessionReact.signOut();
    // clearTeams();
    SuperTokensReact.redirectToAuth();
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <IconButton
        size="large"
        aria-label="account of current user"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={handleMenu}
        sx={{ color: "grey.700" }}
      >
        <AccountCircle />
      </IconButton>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {links.map((link) => {
          return (
            <MenuItem
              key={link.name}
              // LinkComponent={Link}
              // href={link.href}
              onClick={handleClose}
            >
              <Link key={link.name} href={link.href}>
                {link.label}
              </Link>
            </MenuItem>
          );
        })}
        <MenuItem onClick={handleLogout}>{t("sign_out")}</MenuItem>
      </Menu>
    </div>
  );
}
