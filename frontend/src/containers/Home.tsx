import React from "react";

import ConfigTabs from "./ConfigTabs";
import NavAppBar from "./NavAppBar";
import { AuthProvider } from "../context/AuthContext";
import { DoctorsProvider } from "../context/DoctorsContext";
import { HospitalProvider } from "../context/HospitalContext";

export default function Home() {
  return (
    <div>
      <AuthProvider>
        <HospitalProvider>
          <DoctorsProvider>
            <NavAppBar />
            <ConfigTabs />
          </DoctorsProvider>
        </HospitalProvider>
      </AuthProvider>
    </div>
  );
}
