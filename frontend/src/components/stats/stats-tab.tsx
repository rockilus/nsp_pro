import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// Components
import StatsTable from "./table/stats-table";
import StatsNavBar from "./nav-bar/stats-nav-bar";
// Skeletons
import ScheduleSelectorSkeleton from "../skeletons/schedule-selector-skeleton";
import ScheduleTableSkeleton from "../skeletons/schedule-table-skeleton";
// Hooks
import {
  useGetStatsTabData,
  useGetStats,
  useAddHeader,
  useDeleteHeader,
} from "../../hooks/useStats";
import { useStatsOptions } from "../../app/lib/hooks/useStatsOptions";
import { getDefaultStatsOptions } from "../../app/lib/utils/statsOptionsUtils";
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

  // Stats hooks
  const getStatsTabData = useGetStatsTabData();
  const getStats = useGetStats();
  const addHeader = useAddHeader();
  const deleteHeader = useDeleteHeader();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [stats, setStats] = useState<StatsT | null>(null);
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(
    null
  );
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ShiftWorkerOptionT[]>([]);

  // Use persistent stats options
  const defaultOptions = getDefaultStatsOptions();

  const [statsOptions, updateStatsOptions, resetStatsOptions] = useStatsOptions(
    selectedTeamId || "",
    defaultOptions
  );

  // resetStatsOptions can be called to reset all options to defaults
  // Example: resetStatsOptions() - useful for settings reset UI

  const hasInitialized = useRef(false);

  const statsUnitOptions: {
    name: StatsUnitOptions;
    label: string;
    description: string;
  }[] = [
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
  // Stats Actions
  //////////////////////////

  const handleGetStats = async (statsOptions: StatsOptionsT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newStats = await getStats(selectedTeamId, statsOptions);
    setStats(newStats);
  };

  const handleUpdateStatsOptions = async (newStatsOptions: StatsOptionsT) => {
    setIsLoadingStats(true);
    await handleGetStats(newStatsOptions);
    updateStatsOptions(newStatsOptions);
    setIsLoadingStats(false);
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
      if (!selectedTeamId) return;

      setIsLoading(true);

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

      // Only initialize stats options once when component first loads
      if (!hasInitialized.current) {
        hasInitialized.current = true;

        // If there's a campaign and the current options are not set to campaign, update them
        if (
          fetchedScheduleCampaign &&
          statsOptions.timeFrame !== StatsTimeFrameOptions.CAMPAING
        ) {
          const campaignOptions: StatsOptionsT = {
            ...statsOptions,
            timeFrame: StatsTimeFrameOptions.CAMPAING,
            startDate: fetchedScheduleCampaign.startDate,
            endDate: fetchedScheduleCampaign.endDate,
          };
          updateStatsOptions(campaignOptions);
          const newStats = await getStats(selectedTeamId, campaignOptions);
          setStats(newStats);
        } else {
          // Use existing stats options from localStorage
          const newStats = await getStats(selectedTeamId, statsOptions);
          setStats(newStats);
        }
      } else {
        // On subsequent loads (e.g., after team change), just fetch with current options
        const newStats = await getStats(selectedTeamId, statsOptions);
        setStats(newStats);
      }
    };

    // Reset initialization flag when team changes
    if (selectedTeamId) {
      hasInitialized.current = false;
      fetchStatsTabData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  return (
    <div className="tab-container-ultrawide" data-testid="stats-page-heading">
      <div className="tab-container-column">
        {isLoading ? (
          <div className="container-schedule-selector-skeleton">
            <ScheduleSelectorSkeleton />
          </div>
        ) : (
          <StatsNavBar
            lng={lng}
            scheduleCampaign={scheduleCampaign}
            statsOptions={statsOptions}
            statsUnitOptions={statsUnitOptions}
            shiftOptions={shiftOptions}
            workers={workers}
            shifts={shifts}
            handleUpdateStatsOptions={handleUpdateStatsOptions}
          />
        )}
        <div className="stats-table-container">
          {stats ? (
            <StatsTable
              lng={lng}
              statsOptions={statsOptions}
              stats={stats}
              workers={workers}
              shifts={shifts}
              statsUnitOptions={statsUnitOptions}
              quickStats={false}
              isLoadingStats={isLoadingStats}
              handleAddHeader={handleAddHeader}
              handleDeleteHeader={handleDeleteHeader}
            />
          ) : (
            <ScheduleTableSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
