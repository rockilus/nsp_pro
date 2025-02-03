import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Components
import StatsTable from "./table/stats-table";
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
import {
  StatsHeaderT,
  StatsT,
  StatsOptionsT,
  StatsUnitOptions,
  StatsTimeFrameOptions,
  HeaderUnitOptions,
} from "../../types/stats";
import { ShiftWorkerOptionT, SWOIdTypes } from "../../types/constraint";
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

  const statsUnitOptions: {
    name: StatsUnitOptions;
    label: string;
    description: string;
  }[] = [
    {
      name: StatsUnitOptions.FAVORITES,
      label: t("stats_unit_custom"),
      description: t("stats_description_custom"),
    },
    {
      name: StatsUnitOptions.NB_DAYS_WORKED,
      label: t("stats_unit_nb_days_worked"),
      description: t("stats_description_nb_days_worked"),
    },
    {
      name: StatsUnitOptions.TIME_WORKED,
      label: t("stats_unit_time_worked"),
      description: t("stats_description_time_worked"),
    },
    {
      name: StatsUnitOptions.NB_SHIFTS_WORKED,
      label: t("stats_unit_nb_shifts_worked"),
      description: t("stats_description_nb_shifts_worked"),
    },
    {
      name: StatsUnitOptions.NB_REST_DAYS,
      label: t("stats_unit_nb_rest_days"),
      description: t("stats_description_nb_rest_days"),
    },
    {
      name: StatsUnitOptions.NB_REST_SHIFTS,
      label: t("stats_unit_nb_rest_shifts"),
      description: t("stats_description_nb_rest_shifts"),
    },
    {
      name: StatsUnitOptions.NB_TIMES_SHIFT,
      label: t("stats_unit_nb_time_shift"),
      description: t("stats_description_nb_time_shift"),
    },
    {
      name: StatsUnitOptions.NB_TIMES_REST,
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
          h.id === headerId ? { ...h, isFavorite: false } : h
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
        setIsLoading(false);

        const statsOptions: StatsOptionsT = {
          timeFrame: fetchedScheduleCampaign
            ? StatsTimeFrameOptions.CAMPAING
            : StatsTimeFrameOptions.LTM,
          startDate: fetchedScheduleCampaign
            ? fetchedScheduleCampaign.startDate
            : dayjs.utc().startOf("day").subtract(1, "year"),
          endDate: fetchedScheduleCampaign
            ? fetchedScheduleCampaign.endDate
            : dayjs.utc().startOf("day"),
          statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
          headerUnit: HeaderUnitOptions.WEEKDAY,
          selectedShifts: [
            {
              name: "all shifts",
              id: "",
              idType: SWOIdTypes.NONE,
              isBoolDim: false,
              categoryName: "All",
            },
          ],
        };
        const newStats = await getStats(statsOptions, selectedTeamId);
        setStats(newStats);
      }
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
          {/* <StatsOptions
            lng={lng}
            statsShiftOptions={shiftOptions}
            statsUnitOptions={statsUnitOptions}
            setShowingCustom={setShowingCustom}
            handleGetStats={handleGetStats}
          />
          <div className="divider-vertical" /> */}
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
