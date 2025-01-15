"use client";

import { useEffect } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import "dayjs/locale/es";
// Stores
import { useTeamStore } from "../../../../providers/team-store-provider";
// Actions
import { getSelectedTeamId } from "../../../lib/team";
// Components
import RequestTab from "../../../../components/request/request-tab";
// Styles
import "../../../../styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const selectedTeamId = useTeamStore((state) => state.selectedTeamId);
  const setSelectedTeamId = useTeamStore((state) => state.setSelectedTeamId);

  useEffect(() => {
    const fetchTeamId = async () => {
      if (!selectedTeamId) {
        const teamId = await getSelectedTeamId();
        setSelectedTeamId(teamId);
      }
    };

    fetchTeamId();
  }, [selectedTeamId, setSelectedTeamId]);

  return (
    <div className="page-layout">
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={lng === "en" ? "en-gb" : lng === "es" ? "es" : "fr"}
      >
        <RequestTab lng={lng} selectedTeamId={selectedTeamId} />;
      </LocalizationProvider>
    </div>
  );
}
