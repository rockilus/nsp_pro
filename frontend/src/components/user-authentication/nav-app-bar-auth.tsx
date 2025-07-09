"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import i18next from "i18next";

// MUI
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

import { languages } from "../../app/i18n/settings";

const logoWidthOriginal = 753;
const logoHeightOriginal = 98;
const logoAdjustFactor = 0.2;
const logoWidth = logoWidthOriginal * logoAdjustFactor;
const logoHeight = logoHeightOriginal * logoAdjustFactor;

const NavAppBarAuth = ({ lng }: { lng: string }) => {
  const links: Record<string, string> = {
    en: "https://www.rockilus.com",
    es: "https://www.rockilus.com/es/home-es/",
    fr: "https://www.rockilus.com/fr/landing-page/",
  };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = `${pathname}?${searchParams.toString()}`;

  return (
    <AppBar
      position="static"
      sx={{ backgroundColor: "white", boxShadow: "none" }}
    >
      <Toolbar>
        <Box
          display="flex"
          justifyContent="space-between"
          width="100%"
          alignItems="center"
        >
          <Link href={links[lng] || links["en"]} passHref>
            <img
              src="/rockilus_logo_blue.jpg"
              alt="logo"
              width={logoWidth}
              height={logoHeight}
            />
          </Link>
          <Box sx={{ display: "flex" }}>
            {languages
              .filter((l) => l !== lng)
              .map((l) => (
                <Typography
                  key={l}
                  sx={{
                    color: "#425466",
                    marginRight: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                  }}
                  onClick={() => {
                    const newPath = fullPath.replace(/^\/[a-z]{2}/, `/${l}`);
                    i18next.changeLanguage(l);
                    router.push(newPath);
                  }}
                >
                  {l.toUpperCase()}
                </Typography>
              ))}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default NavAppBarAuth;
