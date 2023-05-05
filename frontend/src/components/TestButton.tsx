import * as React from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

import { getProtectedRequest } from "../services/api";
import { UserContext } from "../context/UserContext";

export default function TestButton() {
  const handleClick = async () => {
    const response = await getProtectedRequest();
    console.log("response", response);
  };

  return (
    <Stack spacing={2} direction="row">
      <Button variant="outlined" onClick={handleClick}>
        Contained
      </Button>
    </Stack>
  );
}
