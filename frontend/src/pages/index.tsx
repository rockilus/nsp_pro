import React from "react";
import SessionReact from "supertokens-auth-react/recipe/session";
import HomePage from "../containers/HomePage";

export default function Home() {
  return (
    <SessionReact.SessionAuth>
      <HomePage />
    </SessionReact.SessionAuth>
  );
}
