import React from "react";

import ConfigDialog from "./ConfigDialog";
import SignUpDialog from "./SignUpDialog";

export default function Home() {
  return (
    <div>
      <ConfigDialog />
      <SignUpDialog />
    </div>
  );
}
