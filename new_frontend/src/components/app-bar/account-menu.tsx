import * as React from "react";
import SessionReact from "supertokens-auth-react/recipe/session";
import SuperTokensReact from "supertokens-auth-react";
import { useTranslation } from "react-i18next";
// MUI
import AccountCircle from "@mui/icons-material/AccountCircle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
// Stores
// import { useTeamStore } from "../../stores/teamStore";

interface Props {
  tabs: { id: string; label: string; type: string }[];
  handleSelectTab: (tabId: string) => void;
}

export default function AccountMenu({ tabs, handleSelectTab }: Props) {
  const { t } = useTranslation();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  // const clearTeams = useTeamStore((state) => state.clearTeams);

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
          vertical: "top",
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
        {tabs
          .filter((t) => t.type === "config")
          .map((tab) => (
            <MenuItem
              key={tab.id}
              onClick={() => {
                handleSelectTab(tab.id);
                handleClose();
              }}
            >
              {tab.label}
            </MenuItem>
          ))}
        {/* <MenuItem onClick={handleClose}>My account</MenuItem> */}
        <MenuItem onClick={handleLogout}>{t("common.sign_out")}</MenuItem>
      </Menu>
    </div>
  );
}
