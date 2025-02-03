import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Components
import StatsTable from "./table/stats-table";
import StatsOptions from "./options/stats-options";
import StatsNavBar from "./nav-bar/stats-nav-bar";
// Skeletons
import CoveragesSkeleton from "../skeletons/coverages-skeleton";
// Actions
import {
  getStatsTabData,
  getStats,
  addHeader,
  deleteHeader,
} from "../../app/lib/stats";
// Styles
import "../../styles/tab-container-styles.css";
import "./stats-tab.css";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { StatsHeaderT, StatsT, StatsOptionsT } from "../../types/stats";
import { ShiftWorkerOptionT } from "../../types/constraint";
import { ScheduleT } from "../../types/schedule";

dayjs.extend(utc);

export default function StatsTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "stats-page");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<StatsT | null>(null);
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(
    null
  );
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftWorkerOptionT[]>([]);

  const [showingCustom, setShowingCustom] = useState<boolean>(true);

  const statsUnitOptions: Record<string, string>[] = [
    {
      name: "custom",
      label: t("stats_unit_custom"),
      description: t("stats_description_custom"),
    },
    {
      name: "nb_days_worked",
      label: t("stats_unit_nb_days_worked"),
      description: t("stats_description_nb_days_worked"),
    },
    {
      name: "time_worked",
      label: t("stats_unit_time_worked"),
      description: t("stats_description_time_worked"),
    },
    {
      name: "nb_shifts_worked",
      label: t("stats_unit_nb_shifts_worked"),
      description: t("stats_description_nb_shifts_worked"),
    },
    {
      name: "nb_rest_days",
      label: t("stats_unit_nb_rest_days"),
      description: t("stats_description_nb_rest_days"),
    },
    {
      name: "nb_rest_shifts",
      label: t("stats_unit_nb_rest_shifts"),
      description: t("stats_description_nb_rest_shifts"),
    },
    {
      name: "nb_times_shift",
      label: t("stats_unit_nb_time_shift"),
      description: t("stats_description_nb_time_shift"),
    },
    {
      name: "nb_times_rest",
      label: t("stats_unit_nb_time_rest"),
      description: t("stats_description_nb_time_rest"),
    },
  ];

  //////////////////////////
  // Header Actions
  //////////////////////////

  const handleGetStats = async (statsOptions: StatsOptionsT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newStats = await getStats(statsOptions, selectedTeamId);
    setStats(newStats);
  };

  //////////////////////////
  // Header Actions
  //////////////////////////

  const handleAddHeader = async (header: StatsHeaderT) => {
    const newHeader = await addHeader(header);
    setStats((prev) => ({
      statsHeaders:
        prev?.statsHeaders.map((h) => (h.id === header.id ? newHeader : h)) ||
        [],
      statsValues:
        prev?.statsValues.map((v) =>
          v.headerId === header.id ? { ...v, headerId: newHeader.id } : v
        ) || [],
    }));
  };

  const handleDeleteHeader = async (headerId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    await deleteHeader(headerId, selectedTeamId);
    setStats((prev) => ({
      statsHeaders:
        prev?.statsHeaders.map((h) =>
          h.id === headerId ? { ...h, inCustom: false } : h
        ) || [],
      statsValues: prev?.statsValues || [],
    }));
  };

  useEffect(() => {
    const fetchStatsTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          scheduleCampaign: fetchedScheduleCampaign,
          shifts: fetchedShifts,
          workers: fetchedWorkers,
          shiftOptions: fetchedShiftOptions,
        }: {
          scheduleCampaign: ScheduleT | null;
          shifts: ShiftT[];
          workers: WorkerT[];
          shiftOptions: ShiftWorkerOptionT[];
        } = await getStatsTabData(selectedTeamId);
        setScheduleCampaign(fetchedScheduleCampaign);
        setShifts(fetchedShifts);
        setWorkers(fetchedWorkers);
        setShiftOptions(fetchedShiftOptions);
      }
      setIsLoading(false);
    };
    fetchStatsTabData();
  }, [selectedTeamId]);

  return (
    <div className="tab-container-ultrawide">
      {isLoading ? (
        <CoveragesSkeleton />
      ) : (
        <div className="tab-container-column">
          <StatsNavBar lng={lng} scheduleCampaign={scheduleCampaign} />
          <StatsOptions
            lng={lng}
            statsShiftOptions={shiftOptions}
            statsUnitOptions={statsUnitOptions}
            setShowingCustom={setShowingCustom}
            handleGetStats={handleGetStats}
          />
          <div className="divider-vertical" />
          <div className="stats-table-container">
            {stats ? (
              showingCustom && stats.statsHeaders.length === 0 ? (
                <span className="user-message">{t("no_custom_stats")}</span>
              ) : (
                <StatsTable
                  lng={lng}
                  stats={stats}
                  showingCustom={showingCustom}
                  workers={workers}
                  shifts={shifts}
                  statsUnitOptions={statsUnitOptions}
                  quickStats={false}
                  handleAddHeader={handleAddHeader}
                  handleDeleteHeader={handleDeleteHeader}
                />
              )
            ) : (
              <span className="user-message">{t("no_stats_selected")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
