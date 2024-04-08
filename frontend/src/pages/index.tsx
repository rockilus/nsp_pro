import React from "react";
import AppProvider from "../providers/AppProvider";
import App from "../containers/App";

export default function Home() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
