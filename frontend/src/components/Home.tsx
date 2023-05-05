import React from "react";

import ConfigDialog from "./ConfigDialog";
import LogoutButton from "./LogoutButton";
import SignInDialog from "./SignInDialog";
import SignUpDialog from "./SignUpDialog";
import TestButton from "./TestButton";

export default function Home() {
  return (
    <div>
      <ConfigDialog />
      <SignUpDialog />
      <SignInDialog />
      <TestButton />
      <LogoutButton />
    </div>
  );
}
