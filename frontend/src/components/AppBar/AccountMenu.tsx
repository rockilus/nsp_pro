import * as React from "react";
import SessionReact from "supertokens-auth-react/recipe/session";
import SuperTokensReact from "supertokens-auth-react";
// MUI
import AccountCircle from "@mui/icons-material/AccountCircle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
// Stores
import { useTeamStore } from "../../stores/teamStore";

export default function AccountMenu() {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const clearTeams = useTeamStore((state) => state.clearTeams);

  const handleLogout = async () => {
    await SessionReact.signOut();
    clearTeams();
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
        sx={{ color: "#65676b" }}
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
        {/* <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleClose}>My account</MenuItem> */}
        <MenuItem onClick={handleLogout}>Sign Out</MenuItem>
      </Menu>
    </div>
  );
}
