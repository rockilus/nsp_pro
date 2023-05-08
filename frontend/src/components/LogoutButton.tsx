import React, { useContext } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

import { AuthContext } from "../context/AuthContext";

export default function LogoutButton() {
  const authContext = useContext(AuthContext);

  const handleClick = async () => {
    await authContext.logout();
  };

  return (
    <Stack spacing={2} direction="row">
      <Button color="inherit" onClick={handleClick}>
        Logout
      </Button>
    </Stack>
  );
}
