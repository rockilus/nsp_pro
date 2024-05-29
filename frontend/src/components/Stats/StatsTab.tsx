import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import StatsTable from "./Table/StatsTable";
import StatsOptions from "./Options/StatsOptions";
// Stores
import { useStatStore } from "../../stores/statsStore";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { StatsShiftOptionsT } from "./types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsShiftOptions: StatsShiftOptionsT;
}

export default function StatsTab({
  team,
  workers,
  shifts,
  statsShiftOptions,
}: Props) {
  const { t } = useTranslation();

  const [showingCustom, setShowingCustom] = useState<boolean>(true);
  const stats = useStatStore((state) => state.stats);

  const statsUnitOptions: Record<string, string>[] = [
    {
      name: "custom",
      label: t("stats.stats_unit_custom"),
      description: t("stats.stats_description_custom"),
    },
    {
      name: "nb_days_worked",
      label: t("stats.stats_unit_nb_days_worked"),
      description: t("stats.stats_description_nb_days_worked"),
    },
    {
      name: "time_worked",
      label: t("stats.stats_unit_time_worked"),
      description: t("stats.stats_description_time_worked"),
    },
    {
      name: "nb_shifts_worked",
      label: t("stats.stats_unit_nb_shifts_worked"),
      description: t("stats.stats_description_nb_shifts_worked"),
    },
    {
      name: "nb_rest_days",
      label: t("stats.stats_unit_custom"),
      description: t("stats.stats_unit_custom"),
    },
    {
      name: "nb_rest_shifts",
      label: t("stats.stats_unit_nb_rest_days"),
      description: t("stats.stats_description_nb_rest_shifts"),
    },
    {
      name: "nb_times_shift",
      label: t("stats.stats_unit_custom"),
      description: t("stats.stats_unit_custom"),
    },
    {
      name: "nb_times_rest",
      label: t("stats.stats_unit_nb_time_shift"),
      description: t("stats.stats_description_nb_time_shift"),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <StatsOptions
        team={team}
        statsShiftOptions={statsShiftOptions}
        statsUnitOptions={statsUnitOptions}
        setShowingCustom={setShowingCustom}
      />
      {stats ? (
        showingCustom && stats.statsHeaders.length === 0 ? (
          <Box
            sx={{
              margin: 2,
              marginLeft: 0,
              overflowX: "auto",
              backgroundColor: "none",
              width: "100%",
            }}
          >
            <Typography
              variant="body1"
              color="textSecondary"
              sx={{ fontStyle: "italic" }}
            >
              {t("stats.no_custom_stats")}
            </Typography>
          </Box>
        ) : (
          <StatsTable
            stats={stats}
            showingCustom={showingCustom}
            workers={workers}
            shifts={shifts}
            statsUnitOptions={statsUnitOptions}
          />
        )
      ) : (
        <Box
          sx={{
            margin: 2,
            marginLeft: 0,
            overflowX: "auto",
            backgroundColor: "none",
            width: "100%",
          }}
        >
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{ fontStyle: "italic" }}
          >
            {t("stats.no_stats_selected")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
