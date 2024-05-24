import React from "react";
import AppProvider from "../providers/AppProvider";
import App from "../containers/App";

import "./i18n";

export default function Home() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
