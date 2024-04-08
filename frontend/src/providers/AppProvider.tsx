import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SessionReact from "supertokens-auth-react/recipe/session";
import { ThemeProvider } from "@mui/material";

import theme from "../styles/theme";

interface Props {
  children: React.ReactNode;
}

const AppProvider = ({ children }: Props) => {
  return (
    <SessionReact.SessionAuth>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </LocalizationProvider>
    </SessionReact.SessionAuth>
  );
};

export default AppProvider;
