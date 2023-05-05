import * as React from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

import { postLogoutRequest } from "../services/api";
import { UserContext } from "../context/UserContext";

export default function LogoutButton() {
  const handleClick = async () => {
    const response = await postLogoutRequest();
    console.log("response", response);
  };

  return (
    <Stack spacing={2} direction="row">
      <Button variant="outlined" onClick={handleClick}>
        Logout
      </Button>
    </Stack>
  );
}
