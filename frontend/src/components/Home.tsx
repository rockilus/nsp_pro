import React from "react";

import ConfigTabs from "./ConfigTabs";
import NavAppBar from "./NavAppBar";
import { AuthProvider } from "../context/AuthContext";
import { HospitalProvider } from "../context/HospitalContext";

export default function Home() {
  return (
    <div>
      <AuthProvider>
        <HospitalProvider>
          <NavAppBar />
          <ConfigTabs />
        </HospitalProvider>
      </AuthProvider>
    </div>
  );
}
